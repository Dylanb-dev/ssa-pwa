/**
 * @param {OffscreenCanvas} canvas
 * @param {ImageBitmap} imageBitmapA
 * @param {ImageBitmap} imageBitmapB
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
		// @ts-ignore
		return { result: false, score: 0 }
	}

	canvas.width = width
	canvas.height = height

	const ctx = canvas.getContext("2d", {
		willReadFrequently: true,
	})
	// @ts-ignore
	ctx.globalCompositeOperation = "difference"
	// @ts-ignore
	ctx.drawImage(imageBitmapA, 0, 0)
	// @ts-ignore
	ctx.drawImage(imageBitmapB, 0, 0)
	// @ts-ignore
	let diff = ctx.getImageData(0, 0, width, height)

	// Noise threshold
	var PIXEL_SCORE_THRESHOLD = 60
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

	if (imageScore > 1000 && imageScore < 200000) {
		// @ts-ignore
		return { result: true, score: imageScore }
	} else {
		// @ts-ignore
		return { result: false, score: imageScore }
	}
}
