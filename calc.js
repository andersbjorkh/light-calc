// Safe scientific expression engine: tokenizer -> recursive-descent parser/evaluator.
// No eval(). Loaded as a classic script (works from file://); exposes globalThis.Calc.
// Grammar (low -> high precedence):
//   expr    := term (('+' | '-') term)*
//   term    := unary (('*' | '/' | 'mod') unary | <implicit *> unary)*
//   unary   := ('-' | '+') unary | power
//   power   := postfix ('^' unary)?          right-associative, allows 2^-1
//   postfix := primary ('!' | '%')*
//   primary := number | constant | func arg | '(' expr ')'

(() => {
class CalcError extends Error {}

const FUNCS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'abs']);
const CONSTS = new Set(['pi', 'e', 'ans']);
const SYMBOLS = { '×': '*', '÷': '/', '−': '-', '–': '-', '√': 'sqrt', 'π': 'pi' };

function tokenize(src) {
  const tokens = [];
  let i = 0;
  let depth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }

    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
    if (num) {
      tokens.push({ type: 'num', value: parseFloat(num[0]) });
      i += num[0].length;
      continue;
    }

    const word = /^[a-z]+/i.exec(src.slice(i));
    if (word) {
      const w = word[0].toLowerCase();
      if (FUNCS.has(w)) tokens.push({ type: 'func', value: w });
      else if (CONSTS.has(w)) tokens.push({ type: 'const', value: w });
      else if (w === 'mod') tokens.push({ type: 'op', value: 'mod' });
      else throw new CalcError('Syntax error');
      i += w.length;
      continue;
    }

    const sym = SYMBOLS[ch] ?? ch;
    if (sym === 'sqrt') tokens.push({ type: 'func', value: 'sqrt' });
    else if (sym === 'pi') tokens.push({ type: 'const', value: 'pi' });
    else if ('+-*/^!%'.includes(sym)) tokens.push({ type: 'op', value: sym });
    else if (sym === '(') { tokens.push({ type: 'lparen' }); depth++; }
    else if (sym === ')') {
      if (depth === 0) throw new CalcError('Syntax error');
      tokens.push({ type: 'rparen' }); depth--;
    }
    else throw new CalcError('Syntax error');
    i++;
  }
  // Auto-close unbalanced trailing parentheses.
  while (depth-- > 0) tokens.push({ type: 'rparen' });
  return tokens;
}

const startsOperand = (t) =>
  t && (t.type === 'num' || t.type === 'const' || t.type === 'func' || t.type === 'lparen');

function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > 170) throw new CalcError('Math error');
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

// Snap values within float noise of an integer (e.g. sin(180°) -> 0).
const snap = (x) => (Math.abs(x - Math.round(x)) < 1e-12 ? Math.round(x) : x);

function applyFunc(name, x, angle) {
  const toRad = angle === 'deg' ? Math.PI / 180 : 1;
  const fromRad = angle === 'deg' ? 180 / Math.PI : 1;
  switch (name) {
    case 'sin': return snap(Math.sin(x * toRad));
    case 'cos': return snap(Math.cos(x * toRad));
    case 'tan': {
      if (angle === 'deg' && ((x % 180) + 180) % 180 === 90) throw new CalcError('Math error');
      return snap(Math.tan(x * toRad));
    }
    case 'asin': return Math.asin(x) * fromRad;
    case 'acos': return Math.acos(x) * fromRad;
    case 'atan': return Math.atan(x) * fromRad;
    case 'ln': return Math.log(x);
    case 'log': return Math.log10(x);
    case 'sqrt': return Math.sqrt(x);
    case 'abs': return Math.abs(x);
  }
  throw new CalcError('Syntax error');
}

function evaluate(src, { angle = 'deg', ans = 0 } = {}) {
  const tokens = tokenize(src);
  if (tokens.length === 0) throw new CalcError('Syntax error');
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v) => peek()?.type === 'op' && peek().value === v;

  function expr() {
    let v = term();
    while (isOp('+') || isOp('-')) {
      const op = tokens[pos++].value;
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  function term() {
    let v = unary();
    for (;;) {
      if (isOp('*') || isOp('/') || isOp('mod')) {
        const op = tokens[pos++].value;
        const r = unary();
        if (op === '*') v *= r;
        else if (r === 0) throw new CalcError('Division by zero');
        else if (op === '/') v /= r;
        else v = ((v % r) + r) % r;
      } else if (startsOperand(peek())) {
        v *= unary(); // implicit multiplication: 2π, 3(4+1), 2sin(30)
      } else {
        return v;
      }
    }
  }

  function unary() {
    if (isOp('-')) { pos++; return -unary(); }
    if (isOp('+')) { pos++; return unary(); }
    return power();
  }

  function power() {
    const base = postfix();
    if (isOp('^')) { pos++; return Math.pow(base, unary()); }
    return base;
  }

  function postfix() {
    let v = primary();
    for (;;) {
      if (isOp('!')) { pos++; v = factorial(v); }
      // '%' is modulo when an operand follows (7%3), otherwise percent (50%).
      else if (isOp('%') && !startsOperand(tokens[pos + 1])) { pos++; v /= 100; }
      else if (isOp('%')) { tokens[pos] = { type: 'op', value: 'mod' }; return v; }
      else return v;
    }
  }

  function primary() {
    const t = tokens[pos++];
    if (!t) throw new CalcError('Syntax error');
    switch (t.type) {
      case 'num': return t.value;
      case 'const': return t.value === 'pi' ? Math.PI : t.value === 'e' ? Math.E : ans;
      case 'lparen': {
        const v = expr();
        if (tokens[pos++]?.type !== 'rparen') throw new CalcError('Syntax error');
        return v;
      }
      case 'func': {
        // sin(30)^2 means (sin 30)^2; without parens, sin 30 takes a unary argument.
        const arg = peek()?.type === 'lparen' ? primary() : unary();
        return applyFunc(t.value, arg, angle);
      }
    }
    throw new CalcError('Syntax error');
  }

  const result = expr();
  if (pos < tokens.length) throw new CalcError('Syntax error');
  if (!Number.isFinite(result)) throw new CalcError('Math error');
  return result;
}

function format(n) {
  if (!Number.isFinite(n)) throw new CalcError('Math error');
  const rounded = Number(n.toPrecision(12));
  if (rounded === 0) return '0';
  const abs = Math.abs(rounded);
  if (abs >= 1e12 || abs < 1e-9) {
    return rounded.toExponential(10).replace(/\.?0+e/, 'e').replace('e+', 'e');
  }
  return String(rounded);
}

globalThis.Calc = { evaluate, format, tokenize, CalcError };
})();
