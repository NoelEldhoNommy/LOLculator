'use strict';

const expressionBox = document.getElementById('expression');
const resultBox = document.getElementById('result');
const jokeBox = document.getElementById('joke');

const operatorsRe = /[+\-*/.]/;

function append(value) {
  // prevent two operator characters in a row
  const last = expressionBox.value.slice(-1);
  if (operatorsRe.test(last) && operatorsRe.test(value)) {
    expressionBox.value = expressionBox.value.slice(0, -1) + value;
  } else {
    expressionBox.value += value;
  }
}

function backspace() {
  expressionBox.value = expressionBox.value.slice(0, -1);
}

function clearDisplay() {
  expressionBox.value = '';
  resultBox.value = '';
  jokeBox.textContent = '';
  jokeBox.classList.remove('show');
}

function sanitizeExpression(expr) {
  if (!expr) return '';
  // normalize compatibility characters (fullwidth → ASCII, etc.)
  try {
    expr = expr.normalize('NFKC');
  } catch (e) {}
  // remove whitespace
  expr = expr.replace(/\s+/g, '');
  // replace common unicode/math symbols with JS operators
  expr = expr
    .replace(/[×✕✖xX]/g, '*')
    .replace(/[÷∕／]/g, '/')
    .replace(/[−–—‐‑]/g, '-')
    .replace(/[＋﹢]/g, '+');
  // remove any unexpected characters (leave digits, operators, parentheses, dot)
  expr = expr.replace(/[^0-9+\-*/().]/g, '');
  // remove trailing operators or dots
  while (/[+\-*/.]$/.test(expr)) expr = expr.slice(0, -1);
  return expr;
}

async function calculate() {
  const raw = expressionBox.value || '';
  const expr = sanitizeExpression(raw);

  if (!expr) {
    resultBox.value = '';
    showJoke('Enter a valid expression to calculate.');
    return;
  }

  if (!/^[0-9+\-*/().]+$/.test(expr)) {
    resultBox.value = 'Error';
    showJoke('Invalid characters detected.');
    return;
  }

  try {
    // Evaluate the sanitized expression using a safe Function constructor.
    // This is restricted to the allowed characters via the regex above.
    const value = Function('"use strict"; return (' + expr + ')')();
    if (typeof value === 'number' && Number.isFinite(value)) {
      resultBox.value = value;
      showJoke(await getRandomJoke(expr, value));
    } else {
      throw new Error('Non-finite result');
    }
  } catch (err) {
    // fallback: try a second pass removing any stray characters and re-evaluating
    try {
      const fallback = expr.replace(/[^0-9+\-*/().]/g, '');
      const value2 = Function('"use strict"; return (' + fallback + ')')();
      if (typeof value2 === 'number' && Number.isFinite(value2)) {
        resultBox.value = value2;
        showJoke(await getRandomJoke(expr, value2));
        return;
      }
    } catch (e) {
      // ignore
    }
    resultBox.value = 'Error';
    showJoke(await getRandomJoke(expr, resultBox.value));
  }

  expressionBox.value = '';
}

async function getRandomJoke(expr, value) {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': 'AIzaSyCWp5mpzoSW5Fl0jEkrlVxkKWRQp5XQE4k',
        },
        body: JSON.stringify({
          'contents': [
            {
              'parts': [
                {
                  'text': `You are inside a calculator which tells joke on every calculation. Tell the joke based on the result of the calculation. Only output the joke and only one joke. This time the calculation expression is ${expr} and the result is ${value}. You need to make the joke based on that calculation expression and result`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      return 'Oops! Something went wrong while fetching a joke.';
    }
    const joke = await response.json();
    return joke.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Failed to fetch joke:', error);
    return 'Oops! Something went wrong while fetching a joke.';
  }
}

function showJoke(text) {
  jokeBox.textContent = text;
  jokeBox.classList.remove('show');
  setTimeout(() => jokeBox.classList.add('show'), 45);
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

// Keyboard support: type numbers/operators, Enter to compute, Backspace to delete, Esc to clear
document.addEventListener('keydown', async (e) => {
  const allowed = '0123456789+-*/().';
  if (allowed.includes(e.key)) {
    e.preventDefault();
    append(e.key);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    await calculate();
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    backspace();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    clearDisplay();
  }
});
