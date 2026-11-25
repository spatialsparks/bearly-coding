// Every string that reaches the page goes through here. `html` is a tagged template whose
// interpolations are escaped unless they are already Safe, so forgetting to escape a value is
// not possible rather than merely unlikely.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export class Safe {
  constructor(text) {
    this.text = text;
  }

  toString() {
    return this.text;
  }
}

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Marks markup this code built itself. Never pass it text that came from a file. */
export const raw = (text) => new Safe(String(text));

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => {
    out += render(value) + strings[i + 1];
  });
  return new Safe(out);
}

function render(value) {
  if (value instanceof Safe) return value.text;
  if (Array.isArray(value)) return value.map(render).join('');
  if (value === null || value === undefined || value === false) return '';
  return esc(value);
}
