import { test } from 'node:test';
import assert from 'node:assert/strict';
import './calc.js';

const { evaluate, format, CalcError } = globalThis.Calc;

const calc = (src, opts) => format(evaluate(src, opts));

test('basic arithmetic and precedence', () => {
  assert.equal(calc('2+3*4'), '14');
  assert.equal(calc('(2+3)*4'), '20');
  assert.equal(calc('10-4-3'), '3');
  assert.equal(calc('8/4/2'), '1');
  assert.equal(calc('7×6÷3−1'), '13');
});

test('powers are right-associative and bind tighter than unary minus', () => {
  assert.equal(calc('2^3^2'), '512');
  assert.equal(calc('-2^2'), '-4');
  assert.equal(calc('(-2)^2'), '4');
  assert.equal(calc('2^-1'), '0.5');
});

test('implicit multiplication', () => {
  assert.equal(calc('2π'), format(2 * Math.PI));
  assert.equal(calc('3(4+1)'), '15');
  assert.equal(calc('(1+1)(2+2)'), '8');
  assert.equal(calc('2sin(30)'), '1');
});

test('trig in degrees and radians', () => {
  assert.equal(calc('sin(30)'), '0.5');
  assert.equal(calc('sin(180)'), '0');
  assert.equal(calc('cos(90)'), '0');
  assert.equal(calc('asin(1)'), '90');
  assert.equal(calc('sin(π/2)', { angle: 'rad' }), '1');
  assert.equal(calc('atan(1)', { angle: 'rad' }), format(Math.PI / 4));
  assert.throws(() => calc('tan(90)'), CalcError);
});

test('functions, constants, and Ans', () => {
  assert.equal(calc('√16'), '4');
  assert.equal(calc('√(9)+1'), '4');
  assert.equal(calc('ln(e)'), '1');
  assert.equal(calc('log(1000)'), '3');
  assert.equal(calc('abs(-5)'), '5');
  assert.equal(calc('Ans*2', { ans: 21 }), '42');
});

test('factorial, percent, and modulo', () => {
  assert.equal(calc('5!'), '120');
  assert.equal(calc('3!!'), '720');
  assert.equal(calc('50%'), '0.5');
  assert.equal(calc('200*15%'), '30');
  assert.equal(calc('7%3'), '1');
  assert.equal(calc('7 mod 3'), '1');
  assert.throws(() => calc('2.5!'), CalcError);
});

test('auto-closes trailing parentheses', () => {
  assert.equal(calc('sin(30'), '0.5');
  assert.equal(calc('2*(3+(4'), '14');
});

test('formatting hides float noise and uses exponents at extremes', () => {
  assert.equal(calc('0.1+0.2'), '0.3');
  assert.equal(calc('1/3'), '0.333333333333');
  assert.equal(calc('10^15'), '1e15');
  assert.equal(calc('2^-40'), '9.0949470177e-13');
  assert.equal(calc('1e3'), '1000');
});

test('errors', () => {
  for (const bad of ['', '2+', '*3', '(1))', '2$3', 'foo(2)']) {
    assert.throws(() => evaluate(bad), CalcError, bad);
  }
  assert.throws(() => evaluate('1/0'), /Division by zero/);
  assert.throws(() => evaluate('√(-1)'), /Math error/);
  assert.throws(() => evaluate('ln(0)'), /Math error/);
});
