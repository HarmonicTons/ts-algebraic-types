// Make illegal states unrepresentable 

// based on https://www.youtube.com/watch?v=2JB1_e5wZmU&feature=youtu.be

// algebric type  
type CheckNumber = number;
type CardNumber = string;
type CardType = "Visa" | "MasterCard";
type CreditCardInfo = {
    CardType: CardType,
    CardNumber: CardNumber
}
type Cash = { method: "Cash" };
type Check = { method: "Check", CheckNumber: CheckNumber };
type CreditCard = { method: "CreditCard", CreditCardInfo: CreditCardInfo };
type PaymentMethod = Cash | Check | CreditCard;

const pay: PaymentMethod = { method: "Cash" }


// nominal type
type String50 = string & { String50: true };
const isString50 = (s: string): s is String50 => {
    if (s.length <= 50) {
        return true;
    }
    return false;
}
const createString50 = (s: string): String50 | undefined => {
    if (isString50(s)) {
        return s as String50;
    }
    return;
}

const azer: string = "azer";

let qsdf: String50 | undefined;
//qsdf = azer;  // will fail
qsdf = createString50("qsdf");
if (isString50(azer)) {
    qsdf = azer;
}


// generic create and cast
type TypeGuard<T, U extends T> = (value: T) => value is U;
type Create<T, U extends T> = (value: T) => U | undefined;
type Cast<T, U extends T> = (value: T) => U;
// safe create
const create = <T,U extends T>(typeGuard: TypeGuard<T, U>): Create<T, U> => (value) => {
    if (typeGuard(value)) {
        return value;
    }
    return;
}
// unsafe create, to use only in tests / where a throw can be handled
const cast = <T,U extends T>(typeGuard: TypeGuard<T, U>): Cast<T,U> => (value) => {
    if (typeGuard(value)) {
        return value;
    }
    throw new Error(`Cast error: value '${value}' does not respect type guard '${typeGuard.name}'.`);
}

type EmailAddress = string & { EmailAddress: true };
const isEmailAddress = (s: string): s is EmailAddress => {
    if (s.match(/^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/)) {
        return true;
    }
    return false;
}
const createEmailAddress = create(isEmailAddress);
const castEmailAddress = cast(isEmailAddress);

let email: EmailAddress;

try {
    //email = "azer@mail.com"; // will fail
    email = castEmailAddress("azer@mail.com"); // success
    //email = castEmailAddress("azermail"); // throw
    console.log("success email");
} catch (error) {
    console.error(error);
}


type VerifiedEmail = EmailAddress & { VerifiedEmail: true };
type VerificationService = (p: {EmailAddres:EmailAddress, VerificationHash: any}) => VerifiedEmail | undefined;
const isEmailVerified = (s: EmailAddress): s is VerifiedEmail => {
    return s.length !== 0;
}

type UnverifiedEmail = EmailAddress & { UnverifiedEmail: true };

type EmailContactInfo = VerifiedEmail | UnverifiedEmail;

type PostalContactInfo = string & { PostalContactInfo: true };

type ContactInfo = 
    {email: EmailContactInfo} | 
    {postal: PostalContactInfo} |
    {email: EmailContactInfo, postal: PostalContactInfo};


const contactInfo1: ContactInfo = {
    email: "azer@mail.com" as UnverifiedEmail
}
const contactInfo2: ContactInfo = {
    postal: "5 rue des marais" as PostalContactInfo
}
const contactInfo3: ContactInfo = {
    email: "azer@mail.com" as UnverifiedEmail,
    postal: "5 rue des marais" as PostalContactInfo
}

//const contactInfo4: ContactInfo = {} // will fail



// combinaison de type 
type StringOfNumbers = string & { StringOfNumbers: true };
const isStringOfNumbers = (s: string): s is StringOfNumbers => {
    if (s.match(/^[0-9]*$/)) {
        return true;
    }
    return false;
}
type String4Or6 = string & { String4Or6: true };
const isString4Or6 = (s: string): s is String4Or6 => {
    if (s.length === 4 || s.length === 6) {
        return true;
    }
    return false;
}

type TrainNumber = StringOfNumbers & String4Or6;
const isTrainNumber = (s: string): s is TrainNumber => isStringOfNumbers(s) && isString4Or6(s);
const castTrainNumber = cast(isTrainNumber);

let trainNumber: TrainNumber;

try {
    //trainNumber = "953628"; // will fail
    trainNumber = castTrainNumber("953628"); // success
    //trainNumber = castTrainNumber("95362a"); // throw
    //trainNumber = castTrainNumber("95336"); // throw
    console.log("success train number");
} catch (error) {
    console.error(error);
}