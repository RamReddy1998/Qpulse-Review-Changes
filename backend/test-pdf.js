const pdf = require('pdf-parse');
console.log('PDF type:', typeof pdf);
if (typeof pdf === 'function') {
  console.log('PDF is a function! Classic version confirmed.');
} else {
  console.log('PDF is still NOT a function. Content:', pdf);
}
