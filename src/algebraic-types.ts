import Ajv from "ajv";
import R from "rambda";
const ajv = new Ajv();

type UnderscoredString<U extends string> = `__${U}`;
// equivalent 'of' of F# (generic nominal type)
type Of<T,U extends string> = T & { [key in UnderscoredString<U>]: true };

type ValidationError = object;
type TypeGuard<T> = (value: unknown) => value is T;
type Validator = (candidate: unknown) => readonly ValidationError[];
type Create<T> = (value: unknown) => T | undefined;
type Cast<T> = (value: unknown) => T;

const makeValidator = (schema: object): Validator => (candidate) => {
    const validate = ajv.compile(schema);
    const isValid = validate(candidate) as boolean;
    return validate.errors ?? [];
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
const makeCast = <T>(validator: Validator): Cast<T> => (candidate) => {
    const errors = validator(candidate);
    if (errors.length === 0) {
        return candidate as T;
    }
    throw new Error(`CAST ERROR: candidate does not respect validator '${validator.name}': \n${errors.join("\n")}`);
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
    R.flatten(R.map(validator => validator(candidate), validators));
const makeTypeHandlerFromValidators = <T>(...validators: Validator[]) => {
    const validator = mergeValidators(...validators);
    return makeTypeHandlerFromValidator(validator);
}


// simple type
type PhoneNumber = Of<string,"PhoneNumber">;
const phoneNumberSchema = {
    type: "string",
    pattern: "^[0-9]{10}$"
}
const phoneNumberTypeHandler = makeTypeHandlerFromSchema<PhoneNumber>(phoneNumberSchema)

const phone: PhoneNumber = phoneNumberTypeHandler.cast("0344290262");


// combinaison de types 
type StringOfNumbers = Of<string,'StringOfNumbers'>;
const stringOfNumbersSchema = {
    type: "string",
    pattern: "^[0-9]*$"
}
const stringOfNumbersTypeHandler = makeTypeHandlerFromSchema<StringOfNumbers>(stringOfNumbersSchema)

type String4To6 = Of<string,'String4To6'>;
const string4To6Schema = {
    type: "string",
    minLength: "4",
    maxLength: "6",
}
const string4To6SchemaTypeHandler = makeTypeHandlerFromSchema<StringOfNumbers>(string4To6Schema)

type TrainNumber = StringOfNumbers & String4To6;
const trainNumberTypeHandler = makeTypeHandlerFromValidators<TrainNumber>(
    stringOfNumbersTypeHandler.validator,
    string4To6SchemaTypeHandler.validator
)

