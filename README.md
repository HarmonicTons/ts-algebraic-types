# Nominal Typing

This library provides tools to declare and handle nominal types with Typescript.

# Declare a nominal type:
```ts
type OddNumber = Of<number, "OddNumber">
```

A nominal type is a subset of another type with an explicit name.

These types allow you to encode the business of your application in the typing system:
```ts
type Meter = Of<number, 'Meter'>;
type Second = Of<number, 'Second'>;
type MetersPerSecond = Of<number, 'MetersPerSecond'>;
const calculateSpeed = (distance: Meter, time: Second): MetersPerSecond => {
  return distance / time;
};

const distance = 5 as Meter;
const time = 10 as Second;
const speed = calculateSpeed(distance, time);
```
In the example above, you could not invert distance and time, the code would not compile:
```ts
const speed = calculateSpeed(time, distance);
//                           ^^^^ compile error: Second is not of type Meter
```

# Handle a nominal type
You should use `as` as less as possible. Instead use a type handler by declaring the business rule associated to your nominal type.



## Create a Type Handler from a [JSON-Schema](https://json-schema.org/understanding-json-schema/index.html) :
```ts
type EvenNumber = Of<number, "EvenNumber">
const evenNumberTypeHandler = makeTypeHandler<number, EvenNumber>({ 
    multipleOf: 2
});

// the type handler will check the business rule on cast:
const myEvenNumber: EvenNumber = evenNumberTypeHandler.cast(6);
// here we are certain that "myEvenNumber" is an EvenNumber
```

## Create a Type Handler from custom validator :
```ts
type EvenNumber = Of<number, "EvenNumber">
const evenNumberTypeHandler = makeTypeHandler<number, EvenNumber>((n: number) => {
    if (n % 2 !== 0) {
        return "should be a multiple of 2";
    }
});

// the type handler will check the business rule on cast:
const myEvenNumber: EvenNumber = evenNumberTypeHandler.cast(6);
// here we are certain that "myEvenNumber" is an EvenNumber
```


## Type handlers are important:
```ts
// will NOT compile, you need to use the typehandler or "as" :
const myEvenNumber: EvenNumber = 6; 
// will compile BUT is unsafe (no validation of business rule) :
const myEvenNumber: EvenNumber = 6 as EvenNumber; 
const myEvenNumber: EvenNumber = 5 as EvenNumber; // !!
// will compile AND is safe:
const myEvenNumber: EvenNumber = evenNumberTypeHandler.cast(6);
// will compile and throw an error on runtime:
const myEvenNumber: EvenNumber = evenNumberTypeHandler.cast(5); // CAST ERROR: should be multiple of 2
```

# Combine nominal types
Nominal types are algebraic, which means you can combine them.

## Intersection
X & Y

```ts
type OddNumber = Of<number, 'OddNumber'>;
const oddNuberTypeHandler = makeTypeHandler<number, OddNumber>({
  not: { multipleOf: 2 },
});
type MultipleOf7 = Of<number, 'MultipleOf7'>;
const multipleOf7TypeHandler = makeTypeHandler<number, MultipleOf7>({
  multipleOf: 7,
});

// create a new type from the intersection
type OddNumberAndMultipleOf7 = OddNumber & MultipleOf7;
const oddNumberAndMultipleOf7TypeHandler = typeHandlersIntersection(
  oddNuberTypeHandler,
  multipleOf7TypeHandler,
);

const myNumber: OddNumberAndMultipleOf7 = oddNumberAndMultipleOf7TypeHandler.cast(21);
```

## Union
X | Y

```ts
type OddNumber = Of<number, 'OddNumber'>;
const oddNuberTypeHandler = makeTypeHandler<number, OddNumber>({
  not: { multipleOf: 2 },
});
type MultipleOf7 = Of<number, 'MultipleOf7'>;
const multipleOf7TypeHandler = makeTypeHandler<number, MultipleOf7>({
  multipleOf: 7,
});

// create a new type from the union
type OddNumberOrMultipleOf7 = OddNumber | MultipleOf7;
const OddNumberOrMultipleOf7TypeHandler = typeHandlersIntersection(
  oddNuberTypeHandler,
  multipleOf7TypeHandler,
);

const myNumber: OddNumberOrMultipleOf7 = OddNumberOrMultipleOf7TypeHandler.cast(14);
```


# Array 
Nominal types can be used in array.

```ts
type MultipleOf7 = Of<number, 'MultipleOf7'>;
const multipleOf7TypeHandler = makeTypeHandler<number, MultipleOf7>({
  multipleOf: 7,
});

let myArrayOfMultipleOf7: MultipleOf7[];
// cast each value
myArrayOfMultipleOf7 = [multipleOf7TypeHandler.cast(21), multipleOf7TypeHandler.cast(42)];
// or cast the array:
myArrayOfMultipleOf7 = multipleOf7TypeHandler.castArray([21, 42]);
```
