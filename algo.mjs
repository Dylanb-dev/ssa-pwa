import testArr from "./testArr.json" assert { type: "json" }

const longestObject = (arr = []) => {
	if (!arr.length) {
		return 0
	}
	let rows = arr.length,
		cols = arr[0].length
	let res = 0
	let dp = Array(rows).fill({})
	let objects = {}
	let objectCount = 1 
	let longestObject

	function getSize(obj) {
		return Math.sqrt((obj.istart - obj.iend)**2 + (obj.jstart - obj.jend) ** 2)
	}


	for (let i = 0; i < rows; i++) {
		for (let j = 0; j < cols; j++) {
			console.log(arr[i][j])
			if (arr[i][j] == 1) {
				console.log({i, j})
				console.log(dp)
				console.log(objects)
				let left
				let topLeft
				let top
				let topRight
				// [0, 1, 0],
				// [0, 1, 0],

				// Add point to existing objects, or create if does not exist
				if(j > 0 && dp[i][j -1]) {
					console.log("LEFT")
					left = dp[i][j -1]
					dp[i][j] = left

					objects[left].istart = Math.min(i, objects[left].istart)
					objects[left].iend = Math.max(i, objects[left].iend)
					objects[left].jstart = Math.min(j, objects[left].jstart)
					objects[left].jend = Math.max(j, objects[left].jend)
					objects[left].size = getSize(objects[left])

					// Update longest Object i,j coordinates and size
					if(objects[left].size > longestObject.size) {
						longestObject = objects[left]
					}
				}

				if (i>0 && j > 0 && dp[i-1][j -1]) {
					topLeft = dp[i-1][j -1]
					dp[i][j] = topLeft

					objects[topLeft].istart = Math.min(i, objects[topLeft].istart)
					objects[topLeft].iend = Math.max(i, objects[topLeft].iend)
					objects[topLeft].jstart = Math.min(j, objects[topLeft].jstart)
					objects[topLeft].jend = Math.max(j, objects[topLeft].jend)
					objects[topLeft].size = getSize(objects[topLeft])

					// Update longest Object i,j coordinates and size
					if(objects[topLeft].size > longestObject.size) {
						longestObject = objects[topLeft]
					}
				}

				if (i>0 && dp[i-1][j]) {
					top = dp[i-1][j]
					dp[i][j] = top

					objects[top].istart = Math.min(i, objects[top].istart)
					objects[top].iend = Math.max(i, objects[top].iend)
					objects[top].jstart = Math.min(j, objects[top].jstart)
					objects[top].jend = Math.max(j, objects[top].jend)
					objects[top].size = getSize(objects[top])

					// Update longest Object i,j coordinates and size
					if(objects[top].size > longestObject.size) {
						longestObject = objects[top]
					}
				}

				if (i>0 && j < cols -1 && dp[i-1][j+1]) {
					console.log("TOPRIGHT")
					topRight = dp[i-1][j+1]
					dp[i][j] = topRight
					console.log(objects)
					objects[topRight].istart = Math.min(i, objects[topRight].istart)
					objects[topRight].iend = Math.max(i, objects[topRight].iend)
					objects[topRight].jstart = Math.min(j, objects[topRight].jstart)
					objects[topRight].jend = Math.max(j, objects[topRight].jend)
					objects[topRight].size = getSize(objects[topRight])

					// Update longest Object i,j coordinates and size
					if(objects[topRight].size > longestObject.size) {
						longestObject = objects[topRight]
					}
				}
				if(!left && !top && !topLeft && !topRight) {
					console.log('Creating object')

						dp[i][j] = objectCount
						objects[objectCount] = {
							istart: i,
							iend: i,
							jstart: j,
							jend: j,
							size: 1

						}
						console.log(objects[objectCount])
						longestObject = objects[objectCount]
						objectCount++
					}
				}
			
		}
	}
	return Math.ceil(longestObject.size)
}

const test1 = [
	[1, 0, 0, 0],
	[0, 1, 1, 0],
	[0, 1, 0, 1],
]

const test2 = [
	[1, 1, 0],
	[0, 1, 1],
]

const test3 = [
	[0, 1, 1],
	[1, 1, 0],
]

const test4 = [
	[0, 1, 0],
	[0, 1, 0],
]

const test5 = [
	[1, 1, 1],
	[1, 0, 0],
]

const test6 = [
	[0, 1, 1, 1, 0, 0],
	[0, 0, 1, 1, 1, 1],
]

const test7 = [
	[0, 0, 0, 0, 1, 1],
	[0, 0, 0, 1, 1, 0],
	[0, 0, 1, 0, 0, 0],
	[0, 1, 1, 0, 0, 0],
	[0,1, 0, 1, 0, 0],
]

const test8 = [
	[0, 0, 1, 1, 1, 1],
	[1, 1, 1, 0, 0, 0],
]
const test0 = [
	[1, 1],
	[0, 1],
]

// const realTest = testArr.arr

// let test1result =
// 	longestObject(test1) === 4 ? true : `Instead of 4, got ${longestObject(test1)}`
// let test2result =
// 	longestObject(test2) === 3 ? true : `Instead of 3, got ${longestObject(test2)}`
// let test3result =
// 	longestObject(test3) === 3 ? true : `Instead of 3, got ${longestObject(test3)}`
// let test4result =
// 	longestObject(test4) === 1 ? true : `Instead of 2, got ${longestObject(test4)}`
// let test5result =
// 	longestObject(test5) === 3 ? true : `Instead of 3, got ${longestObject(test5)}`

// let test6result =
// 	longestObject(test6) === 5 ? true : `Instead of 5, got ${longestObject(test6)}`

let realtestResult = longestObject(test7)
console.log({ realtestResult })
// console.log({
// 	test1result,
// 	test2result,
// 	test3result,
// 	test4result,
// 	test5result,
// 	test6result,
// 	realtestResult,
// })
