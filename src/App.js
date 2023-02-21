import React, { useState, useRef, useEffect, Component } from "react"
import logo from "./logo.jpg"
import sound from "./ding.mp3"
import image1 from "./test/1.jpeg"
import image2 from "./test/2.jpeg"
import image3 from "./test/3.jpeg"
import image4 from "./test/4.jpeg"
import image5 from "./test/5.jpeg"
import image6 from "./test/6.jpeg"
import image7 from "./test/7.jpeg"
import image8 from "./test/8.jpeg"
import image9 from "./test/9.jpeg"
import test3 from "./test/test3.png"

import line2 from "./test/line2.png"

import algoRef from "./test/algoRef.jpeg"
import algoRefLine from "./test/algoRefLine.jpeg"

import { compareImages } from "./compareImages"
import { format } from "date-fns"

import piexif from "./piexifjs"

import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalBody,
	ModalCloseButton,
	useDisclosure,
	Button,
	Box,
	Flex,
	Text,
	Heading,
	useRadio,
	useRadioGroup,
	HStack,
	Stack,
	Checkbox,
	NumberInput,
	NumberInputField,
	NumberInputStepper,
	NumberIncrementStepper,
	NumberDecrementStepper,
	FormControl,
	FormLabel,
	Switch,
} from "@chakra-ui/react"

const loadImage = (url) =>
	new Promise((resolve, reject) => {
		const img = new Image()
		img.addEventListener("load", () => resolve(img))
		img.addEventListener("error", (err) => reject(err))
		img.src = url
	})

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
// 1. Create a component that consumes the `useRadio` hook
function RadioCard(props) {
	const { getInputProps, getCheckboxProps } = useRadio(props)

	const input = getInputProps()
	const checkbox = getCheckboxProps()

	return (
		<Box as="label">
			<input {...input} />
			<Box
				{...checkbox}
				cursor="pointer"
				borderWidth="1px"
				borderRadius="md"
				boxShadow="md"
				fontSize="sm"
				color="#2D3748"
				_checked={{
					bg: "#3182ce",
					color: "white",
					// borderColor: '#3182ce',
					// borderWidth: '4px'
				}}
				_focus={{
					boxShadow: "outline",
				}}
				px={5}
				py={3}
			>
				{props.children}
			</Box>
		</Box>
	)
}

function App() {
	const VIEW_WIDTH = Math.max(
		document.documentElement.clientWidth || 0,
		window.innerWidth || 0
	)
	const TIMER_VALUES = {
		until_stopped: "Until stopped",
		duration: "Duration (seconds)",
		image_limit: "Number of Images",
	}

	const [isRecording, setIsRecording] = useState(false)
	const [selectedImages, setSelectedImages] = useState([])
	const [isFinished, setIsFinished] = useState(false)
	const [selectedTimer, setSelectedTimer] = useState(TIMER_VALUES.image_limit)
	const [duration, setDuration] = useState(30)
	const [numberOfImages, setNumberOfImages] = useState(10)
	const [hasAlarm, setHasAlarm] = useState(true)
	const [hasCountdown, setHasCountdown] = useState(true)
	const [debugMessage, setDebugMessage] = useState("")
	const [framesCaptured, setFramesCaptured] = useState(null)
	const [photosSaved, setPhotosSaved] = useState(null)

	const [checkedItems, setCheckedItems] = React.useState({})

	const { isOpen, onOpen, onClose } = useDisclosure()

	const streamRef = useRef()
	const imageBMP = useRef([])
	const suggestedImages = useRef([])

	let dp = [[]]

	async function startRecording(
		e,
		isAndroid = false,
		iso = 1000,
		test = false
	) {
		setIsRecording(true)
		setDebugMessage("")
		const constraints = {
			audio: false,
			video: {
				facingMode: "environment",
				height: 8000,
				width: 8000,
			},
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia(constraints)
			streamRef.current = stream
			handleSuccess(isAndroid, iso, test)
		} catch (e) {
			setIsRecording(false)
			console.error(e)
		}
	}

	async function handleSuccess(isAndroid = false, iso = 1000, test = false) {
		setFramesCaptured(0)

		imageBMP.current = []
		console.log("handleSuccess")
		const stream = streamRef.current
		const video = document.querySelector("#video-preview")
		video.srcObject = stream

		const [track] = stream.getVideoTracks()
		document.createElement("canvas")

		const capabilities = track.getCapabilities()
		const settings = track.getSettings()

		dp = Array(settings.height).fill([])
		dp.forEach((el, ind) => {
			dp[ind] = Array(settings.width).fill([])
			dp[ind].forEach((undefined, subInd) => {
				dp[ind][subInd] = Array(4).fill(null)
			})
		})

		console.log("Capabilities: ", capabilities)
		console.log("Settings: ", settings)
		// Basic settings for all camera
		if (
			!test &&
			isAndroid &&
			capabilities.focusMode &&
			capabilities.focusDistance &&
			capabilities.zoom &&
			capabilities.whiteBalanceMode &&
			capabilities.exposureMode &&
			capabilities.iso &&
			capabilities.colorTemperature
		) {
			await track.applyConstraints({
				advanced: [
					{
						exposureMode: "manual",
						whiteBalanceMode: "manual",
						focusMode: "manual",
						colorTemperature: Math.max(3000, capabilities.colorTemperature.min),
					},
				],
			})
			await track.applyConstraints({
				advanced: [
					{
						exposureTime: Math.min(10000, capabilities.exposureTime.max),
						zoom: capabilities.zoom.min,
						focusDistance: capabilities.focusDistance.max,
						iso,
					},
				],
			})
		} else if (capabilities.frameRate) {
			await track.applyConstraints({
				advanced: [
					{
						frameRate: Math.max(1, capabilities.frameRate.min),
					},
				],
			})
		} else {
			setDebugMessage(
				"Sorry your device does not support the correct capture settings"
			)
			stopStreamedVideo()
		}

		setTimeout(() => console.log("Settings: ", track.getSettings()), 10000)
		// eslint-disable-next-line
		const readable = new MediaStreamTrackProcessor(track).readable

		// vars to control our read loop
		let last = 0
		let frameCount = 0
		const datestring = new Date().toString()
		const queuingStrategy = new CountQueuingStrategy({ highWaterMark: 1 })

		let canvasA = document.createElement("canvas")
		// let canvasWorkerA = canvasA.transferControlToOffscreen()

		// navigator.serviceWorker.controller.postMessage({ canvasA: canvasWorkerA }, [
		// 	canvasWorkerA,
		// ])

		// navigator.serviceWorker.onmessage = (e) => {
		// 	const message = e.data
		// 	console.log(`[From Worker]: ${message}`)
		// }

		const writableStream = new WritableStream(
			{
				write: async (frame) => {
					let startAlgo = Date.now()
					frameCount++
					let prevBitmap
					let longestObject

					if (frameCount > 5 && frame.timestamp > last) {
						const ctx = canvasA.getContext("2d", { willReadFrequently: true })
						const bitmap = await createImageBitmap(frame)
						ctx.globalCompositeOperation = "difference"
						let width = bitmap.width / 3
						let height = bitmap.height / 3
						ctx.drawImage(bitmap, 0, 0, width, height)
						const imageData = ctx.getImageData(0, 0, width, height)
						if (frameCount > 7) {
							const { longestObject: t } = lineAlgorithm(imageData)
							longestObject = t
							last = frame.timestamp
							if (longestObject.size > 10) {
								imageBMP.current.push({
									bitmap,
									time: new Date(),
									longestObject,
								})
								console.log(`${last} pushed image`)
							}
						}

						// } else {
						// 	imageBMP.current.push(bitmap)
						// 	console.log(`${last} pushed image`)
						// }
						// navigator.serviceWorker.controller.postMessage({
						// 	bitmap,
						// 	group: datestring,
						// })
						setPhotosSaved(imageBMP.current.length)
						setFramesCaptured(frameCount - 5)
					}
					console.log(`Time taken: ${Date.now() - startAlgo}`)
					// browser only seems to let you have 3 frames open
					frame.close()
					// setTimeout(() => frame.close(), 500)
				},
				close: () => console.log("stream closed"),
				abort: () => console.log("stream aborted"),
			},
			queuingStrategy
		)
		await readable.pipeTo(writableStream)
	}

	async function stopStreamedVideo() {
		const videoPreview = document.querySelector("#video-preview")
		videoPreview.srcObject = null
		const stream = streamRef.current

		const videoTracks = stream.getVideoTracks()

		videoTracks.forEach((track) => {
			track.stop()
			setIsRecording(false)
		})

		onOpen()
		// sleep(1000)
		setIsFinished(true)
	}

	const options = Object.values(TIMER_VALUES)

	const { getRootProps, getRadioProps } = useRadioGroup({
		name: "timer",
		defaultValue: selectedTimer,
		onChange: (t) => setSelectedTimer(t),
	})

	const group = getRootProps()
	const dingSound = new Audio(sound)

	function lighterImageStackTest() {
		const images = [
			image1,
			image2,
			image3,
			image4,
			image5,
			image6,
			image7,
			image8,
			image9,
		]

		const canvas = document.getElementById("debug")

		Promise.all(images.map(loadImage))
			.then((imgs) => Promise.all(imgs.map((a) => createImageBitmap(a))))
			.then((x) => {
				x.map((x) => {
					canvas.width = 800
					canvas.height = 1200
					const ctx = canvas.getContext("2d")
					ctx.globalCompositeOperation = "lighten"
					console.log(ctx)
					console.log(x)
					ctx.drawImage(x, 0, 0)
				})
				console.log("Done")
			})
		// 	const imageEl = new Image()

		// 	// Wait for the sprite sheet to load
		// 	imageEl.onload = async () => {
		// 		const bitmap = await createImageBitmap(imageEl)

		// 	}
		// 	imageEl.src = image
		// })
	}

	useEffect(() => {
		if (
			selectedTimer === TIMER_VALUES.image_limit &&
			framesCaptured === numberOfImages
		) {
			stopStreamedVideo()
			if (hasAlarm) {
				dingSound.play()
			}
		}
	}, [framesCaptured])

	let imageUrls = [image1, image2]
	class ImagePreview extends Component {
		componentDidMount() {
			var canvas = document.getElementById(
				`suggested-images-${this.props.index}`
			)
			var context = canvas.getContext("2d")
			const { longestObject, bitmap } = this.props
			console.log({ longestObject, bitmap })
			if (bitmap && longestObject) {
				context.drawImage(
					bitmap,
					Math.max(0, longestObject.jstart - 100),
					Math.max(0, longestObject.istart - 100),
					300,
					292,
					0,
					0,
					300,
					292
				)
			}
			// load image from data url
			// var imageObj = new Image()
			// imageObj.onload = function () {
			// 	context.drawImage(this, 0, 0, 350, 450)
			// }
			// console.log(imageObj)
			// imageObj.src = this.props.url
		}

		shouldComponentUpdate(nextProps) {
			return this.props.url !== nextProps.url
		}

		render() {
			return (
				<canvas height="296px" id={`suggested-images-${this.props.index}`} />
			)
		}
	}

	const handleSelectedImage = (e, i) => {
		setCheckedItems({ ...checkedItems, [i]: e.target.checked })
	}

	function testCompareImages() {
		const images = [
			image1,
			image2,
			image3,
			image4,
			image5,
			image6,
			image7,
			image8,
			image9,
			test3,
		]

		const canvas = document.getElementById("debug")
		const ctx = canvas.getContext("2d", { willReadFrequently: true })

		Promise.all(images.map(loadImage))
			.then((imgs) => Promise.all(imgs.map((a) => createImageBitmap(a))))
			.then((x) => {
				const startAlgo = Date.now()
				let imageData

				let width = Math.floor(x[0].width / 3)
				let height = Math.floor(x[0].height / 3)

				canvas.width = width
				canvas.height = height

				console.log("Should Pass")
				ctx.drawImage(x[1], 0, 0, width, height)
				imageData = ctx.getImageData(0, 0, width, height)
				console.log(lineAlgorithm(imageData))

				// console.log("Should Pass")
				// ctx.drawImage(x[2], 0, 0, width, height)
				// imageData = ctx.getImageData(0, 0, width, height)
				// console.log(lineAlgorithm(imageData))

				// console.log("Should Pass")
				// ctx.drawImage(x[3], 0, 0, width, height)
				// imageData = ctx.getImageData(0, 0, width, height)
				// console.log(lineAlgorithm(imageData))

				// console.log("Should Pass")
				// ctx.drawImage(x[4], 0, 0, width, height)
				// imageData = ctx.getImageData(0, 0, width, height)
				// console.log(lineAlgorithm(imageData))

				// console.log("Should Pass")
				// ctx.drawImage(x[5], 0, 0, width, height)
				// imageData = ctx.getImageData(0, 0, width, height)
				// console.log(lineAlgorithm(imageData))

				// console.log("Should Fail")
				// ctx.drawImage(x[8], 0, 0, width, height)
				// imageData = ctx.getImageData(0, 0, width, height)
				// console.log(lineAlgorithm(imageData))

				// console.log("Done")
				const endAlgo = Date.now()
				console.log({ time: endAlgo - startAlgo })
			})
	}

	// function checkPixel(imagePix) {
	// 	var PIXEL_SCORE_THRESHOLD = 36

	// 	let k = (i * cols + j) * 4
	// 			let r = imageData.data[k] / 3
	// 			let g = imageData.data[k + 1] / 3
	// 			let b = imageData.data[k + 2] / 3
	// 			let pixelScore = r + g + b
	// 			return pixelScore >= PIXEL_SCORE_THRESHOLD

	// }

	function lineAlgorithm(imageData) {
		// Noise threshold
		var PIXEL_SCORE_THRESHOLD = 48
		let rows = imageData.height
		let cols = imageData.width
		let res = 0
		let arr

		const startAlgo = Date.now()

		let dp = Array(rows).fill({})
		let objects = {}
		let objectCount = 1
		let longestObject = {
			istart: 0,
			iend: 0,
			jstart: 0,
			jend: 0,
			size: 0,
		}

		// const c = document.getElementById("debug2");
		// const ctx = c.getContext("2d");
		// const imgData = ctx.createImageData(imageData.width, imageData.height);
		// c.width = imageData.width
		// c.height = imageData.height

		function getSize(obj) {
			return Math.sqrt(
				(obj.istart - obj.iend) ** 2 + (obj.jstart - obj.jend) ** 2
			)
		}

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				let k = (i * cols + j) * 4
				let r = imageData.data[k] / 3
				let g = imageData.data[k + 1] / 3
				let b = imageData.data[k + 2] / 3
				let pixelScore = r + g + b

				if (pixelScore >= PIXEL_SCORE_THRESHOLD) {
					// imgData.data[k] = 255;
					// imgData.data[k+1] = 0;
					// imgData.data[k+2] = 0;
					// imgData.data[k+3] = 255;

					let left
					let topLeft
					let top
					let topRight
					// [0, 1, 0],
					// [0, 1, 0],

					// Add point to existing objects, or create if does not exist
					if (j > 0 && dp[i][j - 1]) {
						// console.log("LEFT")
						left = dp[i][j - 1]
						dp[i] = { ...dp[i], [j]: left }
						dp[i] = { ...dp[i], [j - 1]: left }

						left.istart = Math.min(i, left.istart)
						left.iend = Math.max(i, left.iend)
						left.jstart = Math.min(j, left.jstart)
						left.jend = Math.max(j, left.jend)
						left.size = getSize(left)
						// Update longest Object i,j coordinates and size
						if (left.size > longestObject.size) {
							longestObject = left
						}
					}

					if (i > 0 && j > 0 && dp[i - 1][j - 1]) {
						// console.log('TOP LEFT')
						topLeft = dp[i - 1][j - 1]
						dp[i] = { ...dp[i], [j]: topLeft }
						dp[i] = { ...dp[i], [j - 1]: topLeft }

						topLeft.istart = Math.min(i, topLeft.istart)
						topLeft.iend = Math.max(i, topLeft.iend)
						topLeft.jstart = Math.min(j, topLeft.jstart)
						topLeft.jend = Math.max(j, topLeft.jend)
						topLeft.size = getSize(topLeft)

						// Update longest Object i,j coordinates and size
						if (topLeft.size > longestObject.size) {
							longestObject = topLeft
						}
					}

					if (i > 0 && dp[i - 1][j]) {
						top = dp[i - 1][j]
						dp[i] = { ...dp[i], [j]: top }
						dp[i] = { ...dp[i], [j - 1]: top }

						top.istart = Math.min(i, top.istart)
						top.iend = Math.max(i, top.iend)
						top.jstart = Math.min(j, top.jstart)
						top.jend = Math.max(j, top.jend)
						top.size = getSize(top)

						// Update longest Object i,j coordinates and size
						if (top.size > longestObject.size) {
							longestObject = top
						}
					}

					if (i > 0 && j < cols - 1 && dp[i - 1][j + 1]) {
						// console.log("TOP RIGHT")
						topRight = dp[i - 1][j + 1]
						dp[i] = { ...dp[i], [j]: topRight }
						dp[i] = { ...dp[i], [j - 1]: topRight }

						topRight.istart = Math.min(i, topRight.istart)
						topRight.iend = Math.max(i, topRight.iend)
						topRight.jstart = Math.min(j, topRight.jstart)
						topRight.jend = Math.max(j, topRight.jend)

						topRight.size = getSize(topRight)

						// Update longest Object i,j coordinates and size
						if (topRight.size > longestObject.size) {
							longestObject = topRight
						}
					}
					if (!left && !top && !topLeft && !topRight) {
						// console.log("NEW OBJECT")
						const newObject = {
							istart: i,
							iend: i,
							jstart: j,
							jend: j,
							size: 1,
						}
						dp[i] = { ...dp[i], [j]: newObject }
						objects = { ...objects, [objectCount]: newObject }
						objectCount++
					}
				}
			}
		}
		// console.log({objects})
		// console.log({objectCount})

		// console.log({longestObject})
		// console.log(JSON.parse(JSON.stringify(dp)))

		// ctx.putImageData(imgData, 0, 0);

		return { longestObject }
	}

	async function testLineAlgorithm() {
		const imageA = await loadImage(line2)
		console.log("LINE IS ~52px")
		const canvas = document.getElementById("debug")
		const ctx = canvas.getContext("2d", {
			willReadFrequently: true,
		})
		let width = imageA.width
		let height = imageA.height
		canvas.width = width
		canvas.height = height

		let imageData
		ctx.drawImage(imageA, 0, 0, width, height)
		imageData = ctx.getImageData(0, 0, width, height)
		console.log(lineAlgorithm(imageData))
	}

	return (
		<div className="App">
			<header className="App-header">
				<Modal
					isOpen={isOpen}
					scrollBehavior="inside"
					onClose={() => {
						onClose()
						var canvas = document.getElementById("download")
						var context = canvas.getContext("2d")
						context.clearRect(0, 0, canvas.width, canvas.height)
						canvas.width = 0
						canvas.height = 0
					}}
				>
					<ModalOverlay />
					<ModalContent>
						<ModalHeader>{`Suggested Photos ${imageBMP.current.length} / ${framesCaptured}`}</ModalHeader>
						<ModalCloseButton />
						<ModalBody>
							<Stack spacing={5} id="suggestedFrames" width="100%">
								{imageBMP.current.map(({ bitmap, longestObject }, i) => {
									return (
										<Flex key={`checkbox-${i}`}>
											<Checkbox
												defaultChecked
												width="100%"
												isChecked={checkedItems[i] === false ? false : true}
												height="300px"
												size="lg"
												onChange={(e) => handleSelectedImage(e, i)}
											>
												<Box
													width="100%"
													height="300px"
													borderRadius="4px"
													border={
														checkedItems[i] === false
															? "4px solid grey"
															: "4px solid #3182ce"
													}
												>
													<ImagePreview
														height="296px"
														bitmap={bitmap}
														longestObject={longestObject}
														index={i}
													/>
												</Box>
											</Checkbox>
										</Flex>
									)
								})}
							</Stack>
						</ModalBody>
						<ModalFooter>
							<Button
								variant="ghost"
								onClick={() => {
									onClose()
									var canvas = document.getElementById("download")
									var context = canvas.getContext("2d")
									context.clearRect(0, 0, canvas.width, canvas.height)
									canvas.width = 0
									canvas.height = 0
								}}
								mr={3}
							>
								Close
							</Button>
							<Button
								colorScheme="blue"
								isDisabled={
									imageBMP.current.length === 0 ||
									!imageBMP.current.find(
										(_, i) =>
											checkedItems[i] === undefined || checkedItems[i] === true
									)
								}
								onClick={() => {
									var canvas = document.getElementById("download")
									var context = canvas.getContext("2d")
									imageBMP.current.map(({ bitmap, time }, i) => {
										if (checkedItems[i] == null || checkedItems[i] === true) {
											canvas.width = bitmap.width
											canvas.height = bitmap.height
											context.drawImage(bitmap, 0, 0)
											var anchor = document.createElement("a")
											const jpegData = canvas.toDataURL("image/jpeg")

											var zeroth = {}
											var exif = {}
											var gps = {}
											console.log(new Date())
											exif[piexif.ExifIFD.DateTimeOriginal] = format(
												new Date(time),
												"yyyy:MM:dd HH:mm:SS"
											)
											exif[piexif.ExifIFD.ExposureTime] = 4
											exif[36880] = "+08:00"
											var lat = -32.05
											var lng = 115.9
											gps[piexif.GPSIFD.GPSLatitudeRef] = lat < 0 ? "S" : "N"
											gps[piexif.GPSIFD.GPSLatitude] =
												piexif.GPSHelper.degToDmsRational(lat)
											gps[piexif.GPSIFD.GPSLongitudeRef] = lng < 0 ? "W" : "E"
											gps[piexif.GPSIFD.GPSLongitude] =
												piexif.GPSHelper.degToDmsRational(lng)
											var exifObj = { "0th": zeroth, Exif: exif, GPS: gps }
											var exifbytes = piexif.dump(exifObj)

											var newJpeg = piexif.insert(exifbytes, jpegData)
											console.log(exifObj)
											console.log(exifbytes)
											console.log(newJpeg)
											anchor.href = newJpeg
											anchor.download = `${new Date()
												.toString()
												.replaceAll(" ", "_")}.jpg`
											anchor.click()
										}
									})
								}}
							>
								Save
							</Button>
						</ModalFooter>
					</ModalContent>
				</Modal>
				<Flex align="center" width="100%">
					<img src={logo} className="App-logo" alt="logo" />
					<Heading fontSize="4xl" colorScheme="blue">
						SSA 221.1
					</Heading>
				</Flex>
				<Text color="InfoText" fontSize="sm">
					{debugMessage}
				</Text>
				{/* <Button
					colorScheme="blue"
					onClick={() => {
						const imageA = new Image()
						const imageB = new Image()

						let imageABitmap
						let imageBBitmap

						// Wait for the sprite sheet to load
						imageA.onload = async () => {
							const bitmap = await createImageBitmap(imageA)
							imageABitmap = bitmap
							console.log({ bitmap })
							if (imageABitmap && imageBBitmap) {
								let res = compareImages(imageABitmap, imageBBitmap, true)
								if (res.result) {
									setDebugMessage(`Passed image comparison test ${res.score}`)
								} else {
									setDebugMessage("Failed image comparison test")
								}
							}
						}
						imageA.src = image1

						imageB.onload = async () => {
							const bitmap = await createImageBitmap(imageB)
							imageBBitmap = bitmap
							console.log({ bitmap })
							if (imageABitmap && imageBBitmap) {
								let res = compareImages(imageABitmap, imageBBitmap, true)
								if (res) {
									setDebugMessage("Passed image comparison test")
								} else {
									setDebugMessage("Failed image comparison test")
								}
							}
						}
						imageB.src = image2
					}}
				>
					Test Compare Images
				</Button> */}
				<Box
					borderWidth="1px"
					borderRadius="lg"
					width="100%"
					minHeight={Math.min(480 / 2, VIEW_WIDTH / 2)}
				>
					<video id="video-preview" autoPlay playsInline></video>
					<audio />
					{isRecording ? (
						<></>
					) : (
						<Text colorScheme="blue">Image preview here</Text>
					)}
				</Box>
				<HStack {...group} p="4px">
					{options.map((value) => {
						const radio = getRadioProps({ value })
						return (
							<RadioCard key={value} {...radio}>
								{value}
							</RadioCard>
						)
					})}
				</HStack>
				{selectedTimer === TIMER_VALUES.duration && (
					<NumberInput
						my="8px"
						step={5}
						size="lg"
						defaultValue={duration}
						min={10}
						max={1000}
						w="100%"
						color="blackAlpha.600"
						onChange={(e) => setDuration(e)}
					>
						<NumberInputField />
						<NumberInputStepper>
							<NumberIncrementStepper />
							<NumberDecrementStepper />
						</NumberInputStepper>
					</NumberInput>
				)}
				{selectedTimer === TIMER_VALUES.image_limit && (
					<NumberInput
						my="8px"
						step={5}
						size="lg"
						defaultValue={numberOfImages}
						min={5}
						max={1000}
						w="100%"
						color="blackAlpha.600"
						onChange={(e) => setNumberOfImages(Number(e))}
					>
						<NumberInputField />
						<NumberInputStepper>
							<NumberIncrementStepper />
							<NumberDecrementStepper />
						</NumberInputStepper>
					</NumberInput>
				)}
				{selectedTimer !== TIMER_VALUES.until_stopped && (
					<FormControl
						display="flex"
						alignItems="center"
						color="#2D3748"
						onChange={({ target }) => setHasAlarm(target.value)}
						my="8px"
					>
						<FormLabel htmlFor="alarm" mb="0">
							Alarm when finished
						</FormLabel>
						<Switch id="alarm" defaultChecked isDisabled />
					</FormControl>
				)}
				<FormControl display="flex" alignItems="center">
					<FormLabel
						htmlFor="countdown"
						mb="0"
						color="#2D3748"
						onChange={({ target }) => setHasCountdown(target.value)}
						my="8px"
					>
						5 second timer before start
					</FormLabel>
					<Switch id="countdown" defaultChecked isDisabled />
				</FormControl>

				{isRecording ? (
					<Button
						mt="5px"
						colorScheme="blue"
						variant="solid"
						onClick={(e) => {
							stopStreamedVideo(e)
						}}
					>
						Stop Recording
					</Button>
				) : (
					<Flex direction="column">
						<Button
							mt="5px"
							colorScheme="blue"
							variant="solid"
							isDisabled={isRecording}
							onClick={(e) => {
								startRecording(e, true, 2400)
								setIsFinished(false)
								if (selectedTimer === TIMER_VALUES.duration) {
									setTimeout(() => {
										dingSound.play()
										stopStreamedVideo()
									}, (duration + 5) * 1000)
								}
							}}
						>
							Start Recording (Android 2400)
						</Button>
						<Button
							mt="5px"
							colorScheme="blue"
							variant="solid"
							isDisabled={isRecording}
							onClick={(e) => {
								startRecording(e, true, 1600)
								setIsFinished(false)
								if (selectedTimer === TIMER_VALUES.duration) {
									setTimeout(() => {
										dingSound.play()
										stopStreamedVideo()
									}, (duration + 5) * 1000)
								}
							}}
						>
							Start Recording (Android 1600)
						</Button>
						<Button
							mt="5px"
							colorScheme="blue"
							variant="solid"
							isDisabled={isRecording}
							onClick={(e) => {
								startRecording(e, true, 100)
								setIsFinished(false)
								if (selectedTimer === TIMER_VALUES.duration) {
									setTimeout(() => {
										dingSound.play()
										stopStreamedVideo()
									}, (duration + 5) * 1000)
								}
							}}
						>
							Start Recording (Android 100)
						</Button>
						{/* <Button
							mt="5px"
							ml="5px"
							colorScheme="blue"
							variant="solid"
							isDisabled={isRecording}
							onClick={(e) => {
								e.preventDefault()
								testLineAlgorithm()
							}}
						>
							Test line Detection
						</Button> */}
					</Flex>
				)}
				{/* <Button
					mt="5px"
					colorScheme="blue"
					variant="solid"
					isDisabled={isRecording}
					onClick={(e) => {
						e.preventDefault()
						// lighterImageStackTest()
						testCompareImages()
					}}
				>
					Test compare Images
				</Button> */}
				{framesCaptured !== null && (
					<Text fontSize="sm">{`Photos taken: ${framesCaptured}`}</Text>
				)}
				{photosSaved !== null && (
					<Text fontSize="sm">{`Photos saved: ${photosSaved}`}</Text>
				)}
				{isFinished && (
					<Text
						fontSize="sm"
						colorScheme="red"
					>{`Finished Recording Successfully`}</Text>
				)}
				<canvas id="worker" height="0px"></canvas>
				<canvas id="download" height="0px"></canvas>
				<canvas id="debug" height="800px" width="600px"></canvas>
				<Flex justify="center" id="capturedFrames" w="100%">
					<canvas id="debug2" height="800px" width="600px"></canvas>
				</Flex>
				<Flex direction="column" id="capturedFrames" w="480px"></Flex>
			</header>
		</div>
	)
}

export { App }
