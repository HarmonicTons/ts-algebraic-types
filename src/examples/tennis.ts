import { makeTypeHandler, Of } from '../main';

type Point = 'Love' | 'Fifty' | 'Thirty' | 'Forty';
type Points = Of<[Point, Point], 'Points'>;
const pointsTypeHandler = makeTypeHandler<[Point, Point], Points>(
  ([p1, p2]) => {
    // score cannot be Forty/Forty, it is "Deuce"
    if (p1 === 'Forty' && p2 === 'Forty') {
      return 'should be Deuce';
    }
  },
);
type Deuce = 'Deuce';
type Advantage = 'Adv 1' | 'Adv 2';
type Game = '1 wins' | '2 wins';

type score = Points | Deuce | Advantage | Game;

const validScore1: score = pointsTypeHandler.cast(['Love', 'Fifty']);
const validScore2: score = 'Deuce';
const validScore3: score = '1 wins';

const invalidScore: score = pointsTypeHandler.cast(['Forty', 'Forty']);
