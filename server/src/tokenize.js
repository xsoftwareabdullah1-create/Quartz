export function tokenize(input=''){return String(input).toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu)??[];}
