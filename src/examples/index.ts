import {
  makeTypeHandler,
  Of,
  typeHandlersIntersection,
  typeHandlersUnion,
  Validator,
} from 'src/main';
import * as R from 'ramda';

// basic
type Meter = Of<number, 'Meter'>;
type Second = Of<number, 'Second'>;
const calculateSpeed = (distance: Meter, time: Second): number => {
  return distance / time;
};

const distance = 5 as Meter;
const time = 10 as Second;
const speed = calculateSpeed(distance, time);

// simple type guard
type PhoneNumber = Of<string, 'PhoneNumber'>;
const phoneNumberSchema = {
  pattern: '^[0-9]{10}$',
};
const phoneNumberTypeHandler = makeTypeHandler<string, PhoneNumber>(
  phoneNumberSchema,
);

// safe, will throw if the string is incompatible
const phone = phoneNumberTypeHandler.cast('0123456789');
// unsafe, will not throw if the string is incompatible
const phone2 = '0123456789' as PhoneNumber;
// will throw:
// const phone3 = phoneNumberTypeHandler.cast("azer");
// will not throw
// const phone4 = "azer" as PhoneNumber;

// combinaison de types
type StringOfNumbers = Of<string, 'StringOfNumbers'>;
const stringOfNumbersSchema = {
  type: 'string',
  pattern: '^[0-9]*$',
};
const stringOfNumbersTypeHandler = makeTypeHandler<string, StringOfNumbers>(
  stringOfNumbersSchema,
);

type String4 = Of<string, 'String4'>;
const validatorString4: Validator<string> = (candidate) => {
  if (candidate.length !== 4) {
    return 'should be 4 characters';
  }
};
const string4SchemaTypeHandler = makeTypeHandler<string, String4>(
  validatorString4,
);

type String6 = Of<string, 'String6'>;
const validatorString6: Validator<string> = (candidate) => {
  if (candidate.length !== 6) {
    return 'should be 6 characters';
  }
};
const string6SchemaTypeHandler = makeTypeHandler<string, String6>(
  validatorString6,
);

type String4Or6 = String4 | String6;
const string4Or6TypeHandler = typeHandlersUnion(
  string4SchemaTypeHandler,
  string6SchemaTypeHandler,
);

type TrainNumber = StringOfNumbers & String4Or6;
const trainNumberTypeHandler = typeHandlersIntersection(
  stringOfNumbersTypeHandler,
  string4Or6TypeHandler,
);

const train: TrainNumber = trainNumberTypeHandler.cast('256666');

const trains: TrainNumber[] = [
  trainNumberTypeHandler.cast('2599'),
  trainNumberTypeHandler.cast('256899'),
];
// same as:
const trains2: TrainNumber[] = trainNumberTypeHandler.castArray([
  '2599',
  '256899',
]);

const arrayOfTrains: TrainNumber[][] = [
  trainNumberTypeHandler.castArray(['2599', '256899']),
  trainNumberTypeHandler.castArray(['2599', '256899']),
];

type UniqArray<T> = Of<Array<T>, 'UniqArray'>;
const uniqArrayValidator: Validator<any[]> = (candidate) => {
  if (R.uniq(candidate).length !== candidate.length) {
    return 'should be an array of uniq values';
  }
};
const makeUniqArrayTypeHandler = <T>() =>
  makeTypeHandler<Array<T>, UniqArray<T>>(uniqArrayValidator);

const uniqStringArrayTypeHandler = makeUniqArrayTypeHandler<string>();
const uniqArray: UniqArray<string> = uniqStringArrayTypeHandler.cast([
  '23659',
  '2369',
]);

type UniqTrainNumbers = UniqArray<TrainNumber>;
const uniqTrainNumberArrayTypeHandler = makeUniqArrayTypeHandler<TrainNumber>();
const uniqTrainNumbers: UniqTrainNumbers = uniqTrainNumberArrayTypeHandler.cast(
  trainNumberTypeHandler.castArray(['2564', '256849']),
);

type TwoTrains = {
  train1: TrainNumber;
  train2: TrainNumber;
};
type TwoDifferentTrains = Of<TwoTrains, 'TwoDifferentTrains'>;
const twoDifferentTrainsValidator: Validator<TwoTrains> = (candidate) => {
  if (candidate.train1 === candidate.train2) {
    return 'should be 2 different trains';
  }
};
const twoDifferentTrainsTypeHandler = makeTypeHandler<
  TwoTrains,
  TwoDifferentTrains
>(twoDifferentTrainsValidator);

const twoDifferentTrains: TwoDifferentTrains = twoDifferentTrainsTypeHandler.cast(
  {
    train1: trainNumberTypeHandler.cast('2356'),
    train2: trainNumberTypeHandler.cast('235666'),
  },
);
