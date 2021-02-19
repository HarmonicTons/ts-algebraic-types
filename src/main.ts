import * as Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true });

type UnderscoredString<U extends string> = `__${U}`;
/**
 * Create a new type from a base one
 * @example
 * type OddNumber = Of<number, 'OddNumber'>
 */
export type Of<BaseType, NewTypeName extends string> = BaseType &
  { [key in UnderscoredString<NewTypeName>]: true };

type OrCondition = { Or: ValidationError[] };
type AndCondition = { And: ValidationError[] };
/**
 * Validation error
 * Can be a string, an OR condition or an AND condition
 * @example
 * // A string
 * const err: ValidationError = 'should be an odd number';
 * // An OR condition
 * const err: ValidationError = {
 *   Or: ['should be 4 characters', 'should be 6 characters'],
 * };
 * // An AND condition
 * const err: ValidationError = {
 *   And: ['should be a string of numbers', 'should be 10 characters'],
 * };
 * // Can compose AND & OR
 * const err: ValidationError = {
 *   Or: [
 *     'should be a string of 4 characters',
 *     { And: ['should be a string of numbers', 'should be 10 characters'] },
 *   ],
 * };
 */
export type ValidationError = string | OrCondition | AndCondition;
/**
 * A method that returns ValidationError if a candidate is not of type T
 * @example
 * const myValidator: Validator<string> = (candidate) => {
 *   if (candidate.length !== 4) {
 *     return 'should be 4 characters';
 *   }
 * };
 */
export type Validator<T> = (candidate: T) => ValidationError | undefined;
type TypeGuard<T, U extends T> = (value: T) => value is U;
type Create<T, U extends T> = (value: T) => U | undefined;
type Cast<T, U extends T> = (value: T) => U;
type CastArray<T, U extends T> = (value: T[]) => U[];
type TypeHandler<T, U extends T> = {
  validator: Validator<T>;
  typeGuard: TypeGuard<T, U>;
  create: Create<T, U>;
  cast: Cast<T, U>;
  castArray: CastArray<T, U>;
};

/**
 * Make a validator from a JSON Schema
 */
const makeValidator = <T>(schema: Record<string, unknown>): Validator<T> => (
  candidate,
) => {
  const validate = ajv.compile(schema);
  validate(candidate);
  if (!validate.errors) {
    return;
  }
  const errorArray = validate.errors.map((e) => {
    const msg = e.message ?? 'no message given';
    return e.dataPath === '' ? msg : `${e.dataPath} ${msg}`;
  });
  if (errorArray.length === 1) {
    return errorArray[0];
  }
  return { And: errorArray };
};
/**
 * Make a type guard from a validator
 */
const makeTypeGuard = <T, U extends T>(
  validator: Validator<T>,
): TypeGuard<T, U> => (candidate): candidate is U => {
  const error = validator(candidate);
  return error === undefined;
};
/**
 * Make a create method from a type guard
 */
const makeCreate = <T, U extends T>(
  typeGuard: TypeGuard<T, U>,
): Create<T, U> => (candidate) => {
  if (typeGuard(candidate)) {
    return candidate;
  }
  return;
};
/**
 * Stringify a candidate of unknown type into a max length string
 */
const candidateToString = (candidate: unknown, length = 50): string => {
  const str = JSON.stringify(candidate);
  if (str.length < length) {
    return str;
  }
  return str.slice(0, length) + '...';
};
/**
 * Make a cast method from a validator
 */
const makeCast = <T, U extends T>(validator: Validator<T>): Cast<T, U> => (
  candidate,
) => {
  const errors = validator(candidate);
  if (!errors) {
    return candidate as U;
  }
  throw new Error(
    `CAST ERROR: candidate ${candidateToString(
      candidate,
    )} does not respect validator: \n${JSON.stringify(errors)}`,
  );
};
/**
 * Make a cast array method from a cast method
 */
const makeCastArray = <T, U extends T>(cast: Cast<T, U>): CastArray<T, U> => (
  candidates,
) => {
  return candidates.map(cast);
};
/**
 * Make a type handler from a validator
 */
const makeTypeHandlerFromValidator = <T, U extends T>(
  validator,
): TypeHandler<T, U> => {
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
  };
};
/**
 * Make a type handler from a JSON Schema
 */
const makeTypeHandlerFromSchema = <T, U extends T>(
  schema: Record<string, unknown>,
) => {
  const validator = makeValidator(schema);
  return makeTypeHandlerFromValidator<T, U>(validator);
};
/**
 * Check that a var is not undefined
 */
const notUndefined = <T>(value: T | undefined): value is T => {
  return value !== undefined;
};
/**
 * Make an AND validator from a set of validators
 */
const makeANDValidator = <T>(...validators: Validator<T>[]): Validator<T> => (
  candidate,
) => {
  const results = validators.map((validator) => validator(candidate));
  const nonEmptyResults = results.filter(notUndefined);
  if (nonEmptyResults.length === 0) {
    return;
  }
  if (nonEmptyResults.length === 1) {
    return nonEmptyResults[0];
  }
  return { And: nonEmptyResults };
};
/**
 * Make an OR validator from a set of validators
 */
const makeORValidator = <T>(...validators: Validator<T>[]): Validator<T> => (
  candidate,
) => {
  const results = validators.map((validator) => validator(candidate));
  const nonEmptyResults = results.filter(notUndefined);
  if (nonEmptyResults.length !== results.length) {
    return;
  }
  return { Or: nonEmptyResults };
};

/**
 * Make a type handler containing all the methods required to handle a nominal type
 * @example
 * // from a JSON Schema
 * type StringOfNumbers = Of<string, "StringOfNumbers">
 * const typeHandler = makeTypeHandler<string, StringOfNumbers>({ pattern: '*[0-9]*$' });
 * @example
 * // from a custom Validator
 * type StringOf4Characters = Of<string, "StringOf4Characters">
 * const myValidator: Validator<string, StringOf4Characters> = (candidate) => {
 *   if (candidate.length !== 4) {
 *     return 'should be 4 characters';
 *   }
 * };
 * const typeHandler = makeTypeHandler(myValidator);
 */
export const makeTypeHandler = <T, U extends T>(
  validatorOrSchema: Validator<T> | Record<string, unknown>,
) => {
  if (typeof validatorOrSchema === 'function') {
    const validator = validatorOrSchema as Validator<T>;
    return makeTypeHandlerFromValidator<T, U>(validator);
  }
  const schema = validatorOrSchema as Record<string, unknown>;
  return makeTypeHandlerFromSchema<T, U>(schema);
};

/**
 * Merge 2 type handlers into 1 by intersection (X & Y)
 * @example
 * type OddNumber = Of<number, 'OddNumber'>;
 * const oddNuberTypeHandler = makeTypeHandler<number, OddNumber>({
 *   not: { multipleOf: 2 },
 * });
 * type MultipleOf7 = Of<number, 'MultipleOf7'>;
 * const multipleOf7TypeHandler = makeTypeHandler<number, MultipleOf7>({
 *   multipleOf: 7,
 * });
 * type OddNumberAndMultipleOf7 = OddNumber & MultipleOf7;
 * const oddNumberAndMultipleOf7TypeHandler = typeHandlersIntersection(
 *   oddNuberTypeHandler,
 *   multipleOf7TypeHandler,
 * );
 */
export const typeHandlersIntersection = <T, V extends T, W extends T>(
  th1: TypeHandler<T, V>,
  th2: TypeHandler<T, W>,
) => {
  const validator = makeANDValidator(th1.validator, th2.validator);
  return makeTypeHandlerFromValidator<T, V & W>(validator);
};

/**
 * Merge 2 type handlers into 1 by union (X | Y)
 * @example
 * type OddNumber = Of<number, 'OddNumber'>;
 * const oddNuberTypeHandler = makeTypeHandler<number, OddNumber>({
 *   not: { multipleOf: 2 },
 * });
 * type MultipleOf7 = Of<number, 'MultipleOf7'>;
 * const multipleOf7TypeHandler = makeTypeHandler<number, MultipleOf7>({
 *   multipleOf: 7,
 * });
 * type OddNumberOrMultipleOf7 = OddNumber | MultipleOf7;
 * const oddNumberOrMultipleOf7TypeHandler = typeHandlersUnion(
 *   oddNuberTypeHandler,
 *   multipleOf7TypeHandler,
 * );
 */
export const typeHandlersUnion = <T, V extends T, W extends T>(
  th1: TypeHandler<T, V>,
  th2: TypeHandler<T, W>,
) => {
  const validator = makeORValidator(th1.validator, th2.validator);
  return makeTypeHandlerFromValidator<T, V | W>(validator);
};
