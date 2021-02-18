// Make illegal states unrepresentable 

// algebraic types  
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
type String50 = string & { __String50: true };  // & { __brand: true } permet d'identifier que c'est une string soumise à des contraintes supplémentaires
const isString50 = (s: string): s is String50 => {
    if (s.length <= 50) {
        return true;
    }
    return false;
}
const createString50 = (s: string): String50 | undefined => {
    if (isString50(s)) {
        return s;
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


// generic of, create and cast ----------------------------------------------------------------------
type UnderscoredString<U extends string> = `__${U}`;
// equivalent 'of' of F# (generic nominal type)
type Of<T,U extends string> = T & { [key in UnderscoredString<U>]: true };
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
// ---------------------------------------------------------------------------------------------------

type EmailAddress = Of<string,'EmailAddress'>;
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


type VerifiedEmail = Of<EmailAddress,'VerifiedEmail'>;
type VerificationService = (p: {EmailAddres:EmailAddress, VerificationHash: any}) => VerifiedEmail | undefined;
const isEmailVerified = (s: EmailAddress): s is VerifiedEmail => {
    return s.length !== 0;
}

type UnverifiedEmail = EmailAddress;

type EmailContactInfo = VerifiedEmail | UnverifiedEmail;

type PostalContactInfo = Of<string,'PostalContactInfo'>;
const isPostalContactInfo = (s: string): s is PostalContactInfo => true; // use your imagination
const castPostalContactInfo = cast(isPostalContactInfo);

// 1 or the other, both, but not none
type ContactInfo = 
    {email: EmailContactInfo} | 
    {postal: PostalContactInfo} |
    {email: EmailContactInfo, postal: PostalContactInfo};


const contactInfo1: ContactInfo = {
    email: castEmailAddress("azer@mail.com")
}
const contactInfo2: ContactInfo = {
    postal: castPostalContactInfo("5 rue des marais")
}
const contactInfo3: ContactInfo = {
    email: castEmailAddress("azer@mail.com"),
    postal: castPostalContactInfo("5 rue des marais")
}

//const contactInfo4: ContactInfo = {} // will fail


// Train

// combinaison de type 
type StringOfNumbers = Of<string,'StringOfNumbers'>;
const isStringOfNumbers = (s: string): s is StringOfNumbers => {
    if (s.match(/^[0-9]*$/)) {
        return true;
    }
    return false;
}
type String4Or6 = Of<string,'String4Or6'>;
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

// Tennis

type Point = "Love" | "Fifteen" | "Thirty" | "Forty"
type Player = 'PlayerOne' | 'PlayerTwo'

type UnconstrainedPoints = {
    PlayerOne: Point;
    PlayerTwo: Point;
}
type Points = Of<UnconstrainedPoints,'Points'>;
const isPoints = (p: UnconstrainedPoints): p is Points => {
    if (p.PlayerOne !== "Forty" || p.PlayerTwo !== "Forty") {
        return true;
    }
    return false;
}
const castPoints = cast(isPoints);

type Forty = {
    player: Player,
    otherPlayerPoint: Exclude<Point,"Forty">
}
