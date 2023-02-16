/**
 * @param {Canvas} canvas
 * @param {ImageBitmap} imageBitmapA
 * @param {ImageBitmap} imageBitmapB
 * @param {boolean} debug
 * @returns {{result: boolean, score: number, c}} myObj

 */
export function compareImages(canvas, imageBitmapA, imageBitmapB) {
	console.log("COMPARE IMAGES")
	let width
	let height
	if (
		imageBitmapA.width === imageBitmapB.width &&
		imageBitmapA.height === imageBitmapB.height
	) {
		width = imageBitmapA.width
		height = imageBitmapB.height
	} else {
		console.error(
			`image A is ${imageBitmapA.width}x${imageBitmapA.height}px and image B is ${imageBitmapB.width}x${imageBitmapB.height}px so cannot compare`
		)
		return { result: false, score: 0 }
	}

	canvas.width = width
	canvas.height = height

	const ctx = canvas.getContext("2d", {
		willReadFrequently: true,
	})
	ctx.globalCompositeOperation = "difference"
	ctx.drawImage(imageBitmapA, 0, 0)
	ctx.drawImage(imageBitmapB, 0, 0)
	let diff = ctx.getImageData(0, 0, width, height)

	// Noise threshold
	var PIXEL_SCORE_THRESHOLD = 12
	var imageScore = 0
	// Difference threshold, kinda useless
	for (var i = 0; i < diff.data.length; i += 4) {
		var r = diff.data[i] / 3
		var g = diff.data[i + 1] / 3
		var b = diff.data[i + 2] / 3
		var pixelScore = r + g + b
		if (pixelScore >= PIXEL_SCORE_THRESHOLD) {
			imageScore++
		}
	}
	// for (var i = 0; i < diff.data.length; i += 4) {
	// 	var r = diff.data[i] / 3
	// 	var g = diff.data[i + 1] / 3
	// 	var b = diff.data[i + 2] / 3
	// 	var pixelScore = r + g + b
	// 	if (pixelScore >= PIXEL_SCORE_THRESHOLD) {
	// 		imageScore++
	// 	}
	// }

	if (imageScore > 1000 && imageScore < 200000) {
		return { result: true, score: imageScore }
	} else {
		return { result: false, score: imageScore }
	}
}
