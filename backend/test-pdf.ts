import pdf from 'pdf-parse';
console.log('PDF default type:', typeof pdf);
if (typeof pdf === 'object') {
  console.log('PDF keys:', Object.keys(pdf));
}
