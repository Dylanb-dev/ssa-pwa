import * as R from "ramda"

/**
 * @param {number} x
 * @returns {(y: number) => number}
 */
function add(x) {
	return function add(y) {
		return x + y
	}
}

const b = add(2)
b(3)
console.log(b(3))
