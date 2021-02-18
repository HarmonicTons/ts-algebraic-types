import * as Ajv from "ajv";
import * as R from "rambda";
const ajv = new Ajv({ allErrors: true });

type UnderscoredString<U extends string> = `__${U}`;
// equivalent 'of' of F# (generic nominal type)
type Of<T, U extends string> = T & { [key in UnderscoredString<U>]: true };

type ValidationError = string | { Or: ValidationError[][] } | {And: ValidationError[][]};
type TypeGuard<T, U extends T> = (value: T) => value is U;
type Validator<T> = (candidate: T) => ValidationError[];
type Create<T, U extends T> = (value: T) => U | undefined;
type Cast<T, U extends T> = (value: T) => U;
type CastArray<T, U extends T> = (value: T[]) => U[];
type TypeHandler<T, U extends T> = {
    validator: Validator<T>;
    typeGuard: TypeGuard<T,U>;
    create: Create<T,U>;
    cast: Cast<T,U>;
    castArray: CastArray<T,U>;
}

const makeValidator = <T, U extends T>(schema: object): Validator<T> => (candidate) => {
    const validate = ajv.compile(schema);
    const isValid = validate(candidate) as boolean;
    return validate.errors?.map(e =>
        e.dataPath === "" ? e.message : `${e.dataPath} ${e.message}`
    ) ?? [];
}
const makeTypeGuard = <T, U extends T>(validator: Validator<T>): TypeGuard<T, U> => (candidate): candidate is U => {
    const errors = validator(candidate);
    return errors.length === 0;
}
const makeCreate = <T, U extends T>(typeGuard: TypeGuard<T, U>): Create<T, U> => (candidate) => {
    if (typeGuard(candidate)) {
        return candidate;
    }
    return;
}
const candidateToString = <T>(candidate: unknown, l: number = 50): string => {
    const str = JSON.stringify(candidate);
    if (str.length < l) {
        return str;
    }
    return str.slice(0, l) + "...";
}
const makeCast = <T, U extends T>(validator: Validator<T>): Cast<T, U> => (candidate) => {
    const errors = validator(candidate);
    if (errors.length === 0) {
        return candidate as U;
    }
    throw new Error(`CAST ERROR: candidate ${candidateToString(candidate)} does not respect validator: \n${errors.map(v => JSON.stringify(v)).join("\n")}`);
}

const makeCastArray = <T, U extends T>(cast: Cast<T, U>): CastArray<T, U> => (candidates) => {
    return candidates.map(cast);
}

const makeTypeHandlerFromValidator = <T, U extends T>(validator): TypeHandler<T,U> => {
    const typeGuard = makeTypeGuard<T, U>(validator);
    const create = makeCreate<T, U>(typeGuard);
    const cast = makeCast<T, U>(validator);
    const castArray = makeCastArray<T, U>(cast);
    return {
        validator,
        typeGuard,
        create,
        cast,
        castArray,
    }
}
const makeTypeHandlerFromSchema = <T, U extends T>(schema: object) => {
    const validator = makeValidator(schema);
    return makeTypeHandlerFromValidator<T, U>(validator);
}
const makeANDValidator = <T>(...validators: Validator<T>[]): Validator<T> => (candidate) => {
    const results = validators.map(validator => validator(candidate));
    const nonEmptyResults = results.filter(r => r.length !== 0);
    if (nonEmptyResults.length === 0) {
        return [];
    }
    if (nonEmptyResults.length === 1) {
        return nonEmptyResults[0];
    }
    return [{And: nonEmptyResults}];
};
const makeORValidator = <T>(...validators: Validator<T>[]): Validator<T> => (candidate) => {
    const results = validators.map(validator => validator(candidate));
    const nonEmptyResults = results.filter(r => r.length !== 0);
    if (nonEmptyResults.length !== results.length) {
        return [];
    }
    return [{Or: nonEmptyResults}];
};
const makeTypeHandlerFromValidators = <T, U extends T>(...validators: Validator<T>[]) => {
    const validator = makeANDValidator(...validators);
    return makeTypeHandlerFromValidator<T, U>(validator);
}

/**
 * Make an object containing all the methods required to handle a nominal type
 */
const makeTypeHandler = <T, U extends T>(...args: [Validator<T>] | [object] | Validator<T>[]) => {
    if (args.length > 1) {
        const validators = args as Validator<T>[];
        return makeTypeHandlerFromValidators<T,U>(...validators);
    }
    if (typeof args[0] === "function") {
        const validator = args[0] as Validator<T>;
        return makeTypeHandlerFromValidator<T,U>(validator);
    }
    const schema = args[0] as object;
    return makeTypeHandlerFromSchema<T,U>(schema);
}

/**
 * Merge 2 type handlers into 1 by intersection
 */
const typeHandlersIntersection = <T, V extends T, W extends T>(th1: TypeHandler<T,V>, th2: TypeHandler<T,W>) => {
    const validator = makeANDValidator(th1.validator, th2.validator);
    return makeTypeHandlerFromValidator<T, V & W>(validator);
}

/**
 * Merge 2 type handlers into 1 by union
 */
const typeHandlersUnion = <T, V extends T, W extends T>(th1: TypeHandler<T,V>, th2: TypeHandler<T,W>) => {
    const validator = makeORValidator(th1.validator, th2.validator);
    return makeTypeHandlerFromValidator<T, V | W>(validator);
}



export const main = () => {
    // basic
    type Meter = Of<number,"Meter">;
    type Second = Of<number,"Second">;
    const calculateSpeed = (distance: Meter, time: Second): number => {
        return distance / time;
    }

    const distance = 5 as Meter;
    const time = 10 as Second;
    const speed = calculateSpeed(distance, time);

    // simple type guard
    type PhoneNumber = Of<string, "PhoneNumber">;
    const phoneNumberSchema = {
        pattern: "^[0-9]{10}$"
    }
    const phoneNumberTypeHandler = makeTypeHandler<string, PhoneNumber>(phoneNumberSchema);

    // safe, will throw if the string is incompatible
    const phone = phoneNumberTypeHandler.cast("0123456789");
    // unsafe, will not throw if the string is incompatible
    const phone2 = "0123456789" as PhoneNumber;
    // will throw:
    // const phone3 = phoneNumberTypeHandler.cast("azer");
    // will not throw 
    // const phone4 = "azer" as PhoneNumber;


    // combinaison de types 
    type StringOfNumbers = Of<string, 'StringOfNumbers'>;
    const stringOfNumbersSchema = {
        type: "string",
        pattern: "^[0-9]*$",
    }
    const stringOfNumbersTypeHandler = makeTypeHandler<string, StringOfNumbers>(stringOfNumbersSchema)

    type String4 = Of<string, 'String4'>;
    const validatorString4: Validator<string> = (candidate) => {
        const errors: string[] = [];
        if (candidate.length !== 4) {
            errors.push("should be 4 characters");
        }
        return errors;
    }
    const string4SchemaTypeHandler = makeTypeHandler<string, String4>(validatorString4);

    type String6 = Of<string, 'String6'>;
    const validatorString6: Validator<string> = (candidate) => {
        const errors: string[] = [];
        if (candidate.length !== 6) {
            errors.push("should be 6 characters");
        }
        return errors;
    }
    const string6SchemaTypeHandler = makeTypeHandler<string, String6>(validatorString6);

    type String4Or6 = String4 | String6;
    const string4Or6TypeHandler = typeHandlersUnion(
        string4SchemaTypeHandler,
        string6SchemaTypeHandler
    )

    type TrainNumber = StringOfNumbers & String4Or6;
    const trainNumberTypeHandler = typeHandlersIntersection(
        stringOfNumbersTypeHandler,
        string4Or6TypeHandler
    )

    const train: TrainNumber = trainNumberTypeHandler.cast("256666");


    const trains: TrainNumber[] = [trainNumberTypeHandler.cast("2599"), trainNumberTypeHandler.cast("256899")];
    // same as: 
    const trains2: TrainNumber[] = trainNumberTypeHandler.castArray(["2599", "256899"]);

    const arrayOfTrains: TrainNumber[][] = [trainNumberTypeHandler.castArray(["2599", "256899"]), trainNumberTypeHandler.castArray(["2599", "256899"])];


    type UniqArray<T> = Of<Array<T>, "UniqArray">
    const uniqArrayValidator: Validator<any[]> = (candidate) => {
        const errors: string[] = [];
        if (R.uniq(candidate).length !== candidate.length) {
            errors.push("should be an array of uniq values");
        }
        return errors;
    }
    const makeUniqArrayTypeHandler = <T>() => makeTypeHandler<Array<T>, UniqArray<T>>(uniqArrayValidator);

    const uniqStringArrayTypeHandler = makeUniqArrayTypeHandler<string>();
    const uniqArray: UniqArray<string> = uniqStringArrayTypeHandler.cast(["23659", "2369"]);

    type UniqTrainNumbers = UniqArray<TrainNumber>;
    const uniqTrainNumberArrayTypeHandler = makeUniqArrayTypeHandler<TrainNumber>();
    const uniqTrainNumbers: UniqTrainNumbers = uniqTrainNumberArrayTypeHandler.cast(trainNumberTypeHandler.castArray(["2564", "256849"]));


    type TwoTrains = {
        train1: TrainNumber,
        train2: TrainNumber,
    }
    type TwoDifferentTrains = Of<TwoTrains, "TwoDifferentTrains">;
    const twoDifferentTrainsValidator: Validator<TwoTrains> = (candidate) => {
        const errors: string[] = [];
        if (candidate.train1 === candidate.train2) {
            errors.push("should be 2 different trains");
        }
        return errors;
    }
    const twoDifferentTrainsTypeHandler = makeTypeHandlerFromValidator<TwoTrains, TwoDifferentTrains>(twoDifferentTrainsValidator);

    const twoDifferentTrains: TwoDifferentTrains = twoDifferentTrainsTypeHandler.cast({
        train1: trainNumberTypeHandler.cast("235666"),
        train2: trainNumberTypeHandler.cast("2356"),
    })

}