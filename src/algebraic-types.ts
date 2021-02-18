import * as Ajv from "ajv";
import * as R from "rambda";
const ajv = new Ajv({ allErrors: true });

type UnderscoredString<U extends string> = `__${U}`;
// equivalent 'of' of F# (generic nominal type)
type Of<T, U extends string> = T & { [key in UnderscoredString<U>]: true };

type ValidationError = string;
type TypeGuard<T> = (value: unknown) => value is T;
type Validator = (candidate: unknown) => readonly ValidationError[];
type Create<T> = (value: unknown) => T | undefined;
type Cast<T> = (value: unknown) => T;

const makeValidator = (schema: object): Validator => (candidate) => {
    const validate = ajv.compile(schema);
    const isValid = validate(candidate) as boolean;
    return validate.errors?.map(e =>
        e.dataPath === "" ? e.message : `${e.dataPath} ${e.message}`
    ) ?? [];
}
const makeTypeGuard = <T>(validator: Validator): TypeGuard<T> => (candidate): candidate is T => {
    const errors = validator(candidate);
    return errors.length === 0;
}
const makeCreate = <T>(typeGuard: TypeGuard<T>): Create<T> => (candidate) => {
    if (typeGuard(candidate)) {
        return candidate;
    }
    return;
}
const candidateToString = (candidate: unknown, l: number = 50): string => {
    const str = JSON.stringify(candidate);
    if (str.length < l) {
        return str;
    }
    return str.slice(0, l) + "...";
}
const makeCast = <T>(validator: Validator): Cast<T> => (candidate) => {
    const errors = validator(candidate);
    if (errors.length === 0) {
        return candidate as T;
    }
    throw new Error(`CAST ERROR: candidate ${candidateToString(candidate)} does not respect validator: \n${errors.join("\n")}`);
}


const makeTypeHandlerFromValidator = <T>(validator: Validator) => {
    const typeGuard = makeTypeGuard<T>(validator);
    return {
        validator,
        typeGuard,
        create: makeCreate<T>(typeGuard),
        cast: makeCast<T>(validator),
    }
}
const makeTypeHandlerFromSchema = <T>(schema: object) => {
    const validator = makeValidator(schema);
    return makeTypeHandlerFromValidator<T>(validator);
}
const mergeValidators = (...validators: Validator[]): Validator => (candidate) =>
    R.uniq(R.flatten(R.map(validator => validator(candidate), validators)));
const makeTypeHandlerFromValidators = <T>(...validators: Validator[]) => {
    const validator = mergeValidators(...validators);
    return makeTypeHandlerFromValidator<T>(validator);
}




export const main = () => {
    // simple type
    type PhoneNumber = Of<string, "PhoneNumber">;
    const phoneNumberSchema = {
        type: "string",
        pattern: "^[0-9]{10}$"
    }
    const phoneNumberTypeHandler = makeTypeHandlerFromSchema<PhoneNumber>(phoneNumberSchema)

    const phone: PhoneNumber = phoneNumberTypeHandler.cast("0674991883");


    // combinaison de types 
    type StringOfNumbers = Of<string, 'StringOfNumbers'>;
    const stringOfNumbersSchema = {
        type: "string",
        pattern: "^[0-9]*$",
    }
    const stringOfNumbersTypeHandler = makeTypeHandlerFromSchema<StringOfNumbers>(stringOfNumbersSchema)

    type String4To6 = Of<string, 'String4To6'>;
    const validatorString4To6: Validator = (candidate) => {
        const errors: string[] = [];
        if (typeof candidate !== "string") {
            errors.push("should be string");
            return errors;
        }
        if (candidate.length !== 4 && candidate.length !== 6) {
            errors.push("should be 4 or 6 characters");
        }
        return errors;
    }
    const string4To6SchemaTypeHandler = makeTypeHandlerFromValidator<StringOfNumbers>(validatorString4To6)

    type TrainNumber = StringOfNumbers & String4To6;
    const trainNumberTypeHandler = makeTypeHandlerFromValidators<TrainNumber>(
        stringOfNumbersTypeHandler.validator,
        string4To6SchemaTypeHandler.validator
    )


    const train: TrainNumber = trainNumberTypeHandler.cast("256899");


    const trains: TrainNumber[] = [];


    type UniqArray = Of<any[],"UniqArray">
    const validatorUniqTrainNumbers: Validator = (candidate) => {
        const errors: string[] = [];
        if (!Array.isArray(candidate)) {
            errors.push("should be array");
            return errors;
        }
        const arrayCandidate = candidate as unknown[];
        if (R.uniq(arrayCandidate).length !== arrayCandidate.length) {
            errors.push("should be array of uniq values");
        }
        return errors;
    }
    const uniqTrainNumbersTypeHandler = makeTypeHandlerFromValidator<UniqArray>(validatorUniqTrainNumbers)

    
    const uniqTrainNumbers: UniqTrainNumbers = uniqTrainNumbersTypeHandler.cast(["23659"]);
}