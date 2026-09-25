# Calculator

A lightweight scientific calculator: one HTML page and one small script, with no dependencies and no build step.

## Use

Open `index.html` in a browser. It works directly from disk. To serve it instead:

```sh
python3 -m http.server 8080   # then visit http://<host>:8080
```

- **Keyboard:** type expressions directly. `Enter` or `=` evaluates, `Esc` clears, and `Backspace` deletes.
- **Touch:** the on-screen keyboard stays hidden, so input comes from the keypad. A hardware keyboard still works.
- **Syntax:** `+ - * / ^ ! %`, `mod`, parentheses (auto-closed), `π`/`pi`, `e`, `Ans`,
  `sin cos tan asin acos atan ln log sqrt/√ abs`, and implicit multiplication (`2π`, `3(4+1)`).
- `%` is percent (`200*15%` = 30), or modulo when an operand follows it (`7%3` = 1).
- **2nd** switches the trig keys to their inverses. **DEG/RAD** sets the angle unit.
- The **AUTO/LIGHT/DARK** button (top right) sets the theme. `AUTO` follows the system setting.
- The result previews live as you type. Invalid input shows no preview.
- **History** keeps the last 10 calculations. Click an entry to insert its result, or **Clear** to empty the list.
- History, `Ans`, the angle mode, and the theme persist in `localStorage`.

## Files

- `calc.js`: the expression engine. It is a recursive-descent parser and does not use `eval`.
- `index.html`: the UI.
- `calc.test.mjs`: the engine tests. Run them with `node --test`.
