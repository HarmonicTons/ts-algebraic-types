import * as Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true });

const validateSchema = <T>(schema: any) => (candidate: T): void => {
  const validate = ajv.compile(schema);
  validate(candidate);
  if (validate.errors) {
    const error: Error & { details?: any } = new Error(
      'Value does not respect schema',
    );
    error.details = validate.errors;
    throw error;
  }
};

type Primitives = number | string | boolean;
abstract class DomainValue<
  T extends Primitives | DomainValue<any>,
  U = T extends Primitives ? T : Primitives
> {
  private _value: U;
  constructor(valueOrDomainObject: T) {
    this.validate?.(valueOrDomainObject);
    if (valueOrDomainObject instanceof DomainValue) {
      this._value = valueOrDomainObject.value;
    } else {
      this._value = (valueOrDomainObject as unknown) as U;
    }
  }

  get value() {
    return this._value;
  }

  validate(candidate: T) {
    return;
  }
}

// test

class PhoneNumber extends DomainValue<string> {
  validate(candidate) {
    validateSchema({
      pattern: '^[0-9]{10}$',
    })(candidate);
  }
}

const pn = new PhoneNumber('0123456789');
console.log(pn.value);
console.log(pn.constructor.name);

// start here

class UnitQuantity extends DomainValue<number> {}
class KilogramQuantity extends DomainValue<number> {}

type OrderQuantity = UnitQuantity | KilogramQuantity;

const anOrderQtyInUnits = new UnitQuantity(10);
const anOrderQtyInKg = new KilogramQuantity(2.5);

const printQuantity = (quantity: OrderQuantity) => {
  if (quantity instanceof UnitQuantity) {
    console.log(`${quantity.value} units`);
  }
  if (quantity instanceof KilogramQuantity) {
    console.log(`${quantity.value} kg`);
  }
};

printQuantity(anOrderQtyInUnits);
printQuantity(anOrderQtyInKg);

// domain value combination

class StringOf6 extends DomainValue<string> {
  validate(candidate: string) {
    if (candidate.length !== 6) {
      throw new Error('Should be a string of 6 characters');
    }
  }
}

const str = new StringOf6('123456'); // ok
// const str = new StringOf6("12345"); // ko

class StringOfNumbers extends DomainValue<string> {
  validate(candidate: string) {
    validateSchema({
      pattern: '^[0-9]*?$',
    })(candidate);
  }
}

const DomainValueIntersection = <T extends Primitives>(
  c1: new (v: any) => DomainValue<any, T>,
  c2: new (v: any) => DomainValue<any, T>,
) => {
  return class extends DomainValue<T> {
    validate(candidate) {
      new c1(candidate);
      new c2(candidate);
    }
  };
};

const DomainValueUnion = <T extends Primitives>(
  c1: new (v: any) => DomainValue<any, T>,
  c2: new (v: any) => DomainValue<any, T>,
) => {
  return class extends DomainValue<T> {
    validate(candidate) {
      let nFailed = 0;
      try {
        new c1(candidate);
      } catch (e) {
        nFailed++;
      }
      try {
        new c2(candidate);
      } catch (e) {
        nFailed++;
      }
      if (nFailed > 1) {
        throw new Error('should match one of the union');
      }
    }
  };
};

class StringOf6AndOfNumbers extends DomainValueIntersection(
  StringOfNumbers,
  StringOf6,
) {}

const str2 = new StringOf6AndOfNumbers('123456'); // ok
// const str2 = new StringOf6AndOfNumbers("12345"); // ko
// const str2 = new StringOf6AndOfNumbers("12345a"); // ko

class TrainNumber extends DomainValue<StringOf6AndOfNumbers> {
  validate(candidate: StringOf6AndOfNumbers) {
    if (!['0', '1'].includes(candidate.value[0])) {
      throw new Error('should start with 0 or 1');
    }
  }
}

const str3 = new TrainNumber(str2); // ok
//const str3 = new TrainNumber(new StringOf6AndOfNumbers('923456')); // ko
