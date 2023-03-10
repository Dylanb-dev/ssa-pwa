import React, { useState, useRef, useEffect, Component } from "react"
import logo from "./logo.jpg"
// @ts-ignore
import sound from "./ding.mp3"
import image1 from "./test/1.jpeg"
import image2 from "./test/2.jpeg"
import image3 from "./test/3.jpeg"
import image4 from "./test/4.jpeg"
// @ts-ignore
// @ts-ignore
import image5 from "./test/5.jpeg"
// @ts-ignore
// @ts-ignore
import image6 from "./test/6.jpeg"
// @ts-ignore
// @ts-ignore
import image7 from "./test/7.jpeg"
// @ts-ignore
// @ts-ignore
import image8 from "./test/8.jpeg"
// @ts-ignore
// @ts-ignore
import image9 from "./test/9.jpeg"
// @ts-ignore
// @ts-ignore
import test3 from "./test/test3.png"
// @ts-ignore
// @ts-ignore
import noise from "./test/noise.jpeg"
// @ts-ignore
// @ts-ignore
import line2 from "./test/line2.png"
// @ts-ignore
// @ts-ignore
import matt1 from "./test/matt1.jpeg"
// @ts-ignore
// @ts-ignore
import matt2 from "./test/matt2.jpeg"
// @ts-ignore
// @ts-ignore
import matt3 from "./test/matt3.jpeg"

// @ts-ignore
// @ts-ignore
import algoRef from "./test/algoRef.jpeg"
// @ts-ignore
// @ts-ignore
import algoRefLine from "./test/algoRefLine.jpeg"

// @ts-ignore
// @ts-ignore
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
// @ts-ignore
import { getStorage, ref, uploadString } from "firebase/storage"
import { initializeApp } from "firebase/app"

const firebaseConfig = {
	apiKey: "AIzaSyBYAQRyqjZ-vjXT1FikWjmVNDpHe4tiyJs",

	authDomain: "space-exposure-d0379.firebaseapp.com",

	projectId: "space-exposure-d0379",

	storageBucket: "space-exposure-d0379.appspot.com",

	messagingSenderId: "963000608298",

	appId: "1:963000608298:web:985c5a76757cdd41f9c553",
}

// Initialize Firebase
initializeApp(firebaseConfig)

// @ts-ignore
const storageRef = getStorage()

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

function lineAlgorithm(imageData, debug = false) {
	// Noise threshold
	var centerPixel = (imageData.width / 2) * (imageData.height / 2) * 4
	var PIXEL_SCORE_THRESHOLD =
		48 +
		Math.min(
			(imageData.data[centerPixel] +
				imageData.data[centerPixel + 1] +
				imageData.data[centerPixel + 2]) /
				3,
			80
		)
	console.log({ PIXEL_SCORE_THRESHOLD })
	let rows = imageData.height
	let cols = imageData.width

	let c
	let ctx
	let imgData

	if (debug) {
		c = document.getElementById("debug2")
		// @ts-ignore
		ctx = c.getContext("2d")
		imgData = ctx.createImageData(imageData.width, imageData.height)
		// @ts-ignore
		c.width = imageData.width
		// @ts-ignore
		c.height = imageData.height
	}

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

	function getSize(obj) {
		return Math.sqrt(
			(obj.istart - obj.iend) ** 2 + (obj.jstart - obj.jend) ** 2
		)
	}
	let count = 0

	for (let i = 0; i < rows; i++) {
		if (count > 1000) {
			if (debug) {
				ctx.putImageData(imgData, 0, 0)
			}
			return { longestObject }
		}
		for (let j = 0; j < cols; j++) {
			if (count > 1000) {
				if (debug) {
					ctx.putImageData(imgData, 0, 0)
				}
				return { longestObject }
			}
			let k = (i * cols + j) * 4
			let r = imageData.data[k]
			let g = imageData.data[k + 1]
			let b = imageData.data[k + 2]
			let pixelScore = (r + g + b) / 3

			if (pixelScore >= PIXEL_SCORE_THRESHOLD) {
				if (debug) {
					imgData.data[k] = 255
					imgData.data[k + 1] = 0
					imgData.data[k + 2] = 0
					imgData.data[k + 3] = 255
				}
				count++
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
	if (debug) {
		ctx.putImageData(imgData, 0, 0)
	}
	console.log({ count })
	return { longestObject }
}


function App() {
	const VIEW_WIDTH = Math.max(
		document.documentElement.clientWidth || 0,
		window.innerWidth || 0
	)
	const TIMER_VALUES = {
		duration: "Duration (seconds)",
		image_limit: "Number of Images",
		until_stopped: "Until stopped",
	}
	const DOWNSAMPLE = 3

	const [isRecording, setIsRecording] = useState(false)

	const [isFinished, setIsFinished] = useState(false)
	const [selectedTimer, setSelectedTimer] = useState(TIMER_VALUES.duration)
	const [duration, setDuration] = useState(600)
	const [numberOfImages, setNumberOfImages] = useState(5)
	// @ts-ignore
	const [serviceWorkerActive, setServiceWorkerActive] = useState(false)

	const [hasAlarm, setHasAlarm] = useState(true)
	// @ts-ignore
	// @ts-ignore
	const [hasCountdown, setHasCountdown] = useState(true)
	const [debugMessage, setDebugMessage] = useState("")
	const [framesCaptured, setFramesCaptured] = useState(null)
	const [photosSaved, setPhotosSaved] = useState(null)

	const [checkedItems, setCheckedItems] = React.useState({})

	const { isOpen, onOpen, onClose } = useDisclosure()

	const streamRef = useRef()
	const imageJpeg = useRef([])
	// @ts-ignore
	const bmpStack = useRef([])

	const offScreenCanvasLighten = useRef()
	// @ts-ignore
	const offScreenCanvasLighter = useRef()
	const offScreenCanvasDifference = useRef()
	const offScreenCanvasFirestore = useRef()
	const exposureTime = useRef()

	const isProcessing = useRef(false)

	// Initialise offscreen canvases
	// useEffect(() => {
	// 	// @ts-ignore
	// 	offScreenCanvasLighten.current = new OffscreenCanvas(0, 100)
	// 	// @ts-ignore
	// 	offScreenCanvasDifference.current = new OffscreenCanvas(0, 100)
	// 	// @ts-ignore
	// 	offScreenCanvasFirestore.current = new OffscreenCanvas(0, 100)
	// }, [])

	// onBitmap(
	// 	bitmap,
	// 	frameCount - 6,
	// 	new Date(),
	// 	group,
	// 	lightenCanvas,
	// 	differenceCanvas
	// )
	// Recieve a sequence of images, return possible streak 4s lighten image with exif data
	const dingSound = new Audio(sound)
	console.log("render")
	// useEffect(() => {
	// 	setServiceWorkerActive(true)

	// 	// if ("serviceWorker" in navigator) {
	// 	// 	navigator.serviceWorker.ready.then((registration) => {
	// 	// 		console.log(`A service worker is active: ${registration.active}`)
	// 	// 		setServiceWorkerActive(true)
	// 	// 		console.log(navigator.serviceWorker)
	// 	// 		navigator.serviceWorker.addEventListener("message", (event) => {
	// 	// 			console.log("RECIEVED MESSAGE FROM WORKER")
	// 	// 			const { date, longestObject, jpeg } = event.data
	// 	// 			console.log({ date, longestObject, jpeg })
	// 	// 			dingSound.play()
	// 	// 			// @ts-ignore
	// 	// 			imageJpeg.current.push({
	// 	// 				date,
	// 	// 				longestObject,
	// 	// 				jpeg,
	// 	// 			})
	// 	// 		})
	// 	// 	})
	// 	// } else {
	// 	// 	console.error("Service workers are not supported.")
	// 	// }
	// }, [])

	async function startRecording(
		// @ts-ignore
		e,
		isAndroid = false,
		iso = 1000,
		test = false
	) {
		setIsRecording(true)
		setDebugMessage("")
		const constraints = {
			audio: false,
			// video: true
			video: {
				facingMode: "environment",
				width: { ideal: 3500 },
				height: { ideal: 3500 },
				resizeMode: {ideal: 'none'},
				frameRate: { ideal: 10 },
			},
		}
		try {
			// const readyServiceWorker = await navigator.serviceWorker.ready
			const stream = await navigator.mediaDevices.getUserMedia(constraints)
			// @ts-ignore
			streamRef.current = stream
			handleSuccess(isAndroid, iso, test)
		} catch (e) {
			setIsRecording(false)
			console.error(e)
		}
	}

	async function handleSuccess(
		// @ts-ignore
		isAndroid = false,
		// @ts-ignore
		defaultIso = 1000,
		test = false
	) {
		// @ts-ignore
		console.log(streamRef.current)
		imageJpeg.current = []
		console.log("handleSuccess")
		const stream = streamRef.current
		const video = document.querySelector("#video-preview")
		video.srcObject = stream
	
		// @ts-ignore
		console.log({stream})
		// @ts-ignore
		const [track] = stream.getVideoTracks()
		console.log({track})

		document.createElement("canvas")

		const capabilities = track.getCapabilities()
		const settings = track.getSettings()
	
		console.log("Capabilities: ", capabilities)
		console.log("Settings: ", settings)
		// Basic settings for all camera
		// setDebugMessage(JSON.stringify({capabilities, settings}))
		// Set exposure time and iso off camera settings
		if (
			!test &&
			capabilities.focusMode &&
			capabilities.focusDistance &&
			capabilities.zoom &&
			capabilities.whiteBalanceMode &&
			capabilities.exposureMode &&
			capabilities.iso &&
			capabilities.exposureTime &&
			capabilities.colorTemperature
		) {
			let maxExposure = capabilities.exposureTime.max
			let iso
			if (maxExposure > 40000) {
				// @ts-ignore
				exposureTime.current = 40000
				iso = 400
			} else if (maxExposure >= 20000) {
				// @ts-ignore
				exposureTime.current = 20000
				iso = 800
			} else if (maxExposure >= 10000) {
				// @ts-ignore
				exposureTime.current = 10000
				iso = 1600
			} else if (maxExposure >= 5000) {
				// @ts-ignore
				exposureTime.current = 5000
				iso = Math.min(3200, capabilities.iso.max)
			} else if (maxExposure >= 1000) {
				// @ts-ignore
				exposureTime.current = 1000
				iso = Math.min(6400, capabilities.iso.max)
			}
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
						exposureTime: exposureTime.current,
						zoom: capabilities.zoom.min,
						focusDistance: capabilities.focusDistance.max,
						// @ts-ignore
						iso: Math.min(iso, capabilities.iso.max),
					},
				],
			})
		} else if (test && capabilities.exposureMode) {
			console.log("test")
			// @ts-ignore
			exposureTime.current = 1000
			await track.applyConstraints({
				advanced: [
					{
						exposureMode: "manual",
					},
				],
			})
			await track.applyConstraints({
				advanced: [
					{
						exposureTime: exposureTime.current,
					},
				],
			})
		} else {
			// @ts-ignore
			exposureTime.current = 1000
		}

		setTimeout(() => {
			const settings = track.getSettings()
			if (!settings.exposureTime && settings.frameRate) {
				console.log({ stream })
				//@ts-ignore
				exposureTime.current = Math.round(10000 / settings.frameRate)
			}
			// exposureTime.current = settings.frameRate
			console.log("Settings: ", settings)
		}, 5000)
		// @ts-ignore
		// eslint-disable-next-line
		const readable = new MediaStreamTrackProcessor(track).readable

		// vars to control our read loop
		// @ts-ignore
		let framesPerFourSeconds = Math.floor(40000 / exposureTime.current)
		let fullcount = 0
		let last
		let frameCount = 0
		let group = new Date().toString()
		const queuingStrategy = new CountQueuingStrategy({ highWaterMark: 1 })
		console.log({ framesPerFourSeconds })
		// @ts-ignore
		let lightenContext
		// @ts-ignore
		let differenceContext
		// @ts-ignore
		// @ts-ignore
		let firestoreContext
		const START_FRAME = 5

		let count = -START_FRAME - 1
		// const sw = await navigator.serviceWorker.ready
		// const serviceWorker = sw.active
		const writableStream = new WritableStream(
			{
				write: async (frame) => {
					frameCount++
					count++

					if (frameCount === START_FRAME) {
						console.log("START_FRAME")
						const bitmap = await createImageBitmap(frame)
						const diffWidth = Math.floor(bitmap.width / 3)
						const diffHeight = Math.floor(bitmap.height / 3)
						last = frame.timestamp
						// @ts-ignore
						// serviceWorker.postMessage(
						// 	{
						// 		width: bitmap.width,
						// 		height: bitmap.height,
						// 		diffWidth,
						// 		diffHeight,
						// 	},
						// 	[bitmap]
						// )
						//@ts-ignore
						offScreenCanvasLighten.current = document.createElement("canvas")
						// @ts-ignore
						offScreenCanvasLighten.current.width = bitmap.width
						// @ts-ignore
						offScreenCanvasLighten.current.height = bitmap.height
						//@ts-ignore
						offScreenCanvasDifference.current = document.createElement("canvas")
						// @ts-ignore
						offScreenCanvasDifference.current.width = diffWidth
						// @ts-ignore
						offScreenCanvasDifference.current.height = diffHeight
						// offScreenCanvasDifference.current = new OffscreenCanvas(diffWidth, diffHeight)

						// //@ts-ignore
						// offScreenCanvasFirestore.current.width = bitmap.width
						// //@ts-ignore
						// offScreenCanvasFirestore.current.height = bitmap.height
						//@ts-ignore
						lightenContext = offScreenCanvasLighten.current.getContext("2d", {
							willReadFrequently: true,
						})
						lightenContext.globalCompositeOperation =
							// @ts-ignore
							exposureTime.current < 10000 ? "lighter" : "lighten"
						//@ts-ignore
						differenceContext = offScreenCanvasDifference.current.getContext(
							"2d",
							{ willReadFrequently: true }
						)
						differenceContext.globalCompositeOperation = "difference"
						bitmap.close()

						// firestoreContext = offScreenCanvasFirestore.current.getContext("2d")}

						// 	// Startup frames
					} else if (
						frameCount > START_FRAME &&
						frame.timestamp > last &&
						count % framesPerFourSeconds !== 0 &&
						!isProcessing.current
					) {
						fullcount++
						// @ts-ignore
						let startAlgo = Date.now()
						last = frame.timestamp
						const bitmap = await createImageBitmap(frame)
						// bmpStack.current.push(bitmap)
						// console.log({ differenceContext, lightenContext })
						const diffWidth = Math.floor(bitmap.width / 3)
						const diffHeight = Math.floor(bitmap.height / 3)
						differenceContext.drawImage(bitmap, 0, 0, diffWidth, diffHeight)
						lightenContext.drawImage(bitmap, 0, 0)
						bitmap.close()
						console.log(`time taken =  ${Date.now() - startAlgo}`)
					} else if (
						frameCount > START_FRAME &&
						frame.timestamp > last &&
						count % framesPerFourSeconds === 0 &&
						!isProcessing.current
					) {
						isProcessing.current = true
						fullcount++

						const bitmap = await createImageBitmap(frame)

						const width = bitmap.width
						const height = bitmap.height
						const diffWidth = Math.floor(width / 3)
						const diffHeight = Math.floor(height / 3)

						differenceContext.drawImage(bitmap, 0, 0, diffWidth, diffHeight)
						lightenContext.drawImage(bitmap, 0, 0)

						bitmap.close()

						const date = new Date()
						const lightenCanvas = offScreenCanvasLighten.current
						// @ts-ignore
						const differenceCanvas = offScreenCanvasDifference.current

						const imageData = differenceContext.getImageData(
							0,
							0,
							diffWidth,
							diffHeight
						)
						const { longestObject } = lineAlgorithm(imageData)
						console.log({ longestObject })
						// Streak found, create final image
						if (longestObject.size > 10 && longestObject.size < 500) {
							var zeroth = {}
							let exif = {}
							let gps = {}
							exif[piexif.ExifIFD.DateTimeOriginal] = format(
								new Date(date),
								"yyyy:MM:dd HH:mm:SS"
							)
							exif[piexif.ExifIFD.ExposureTime] = "4 seconds"
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

							//@ts-ignore

							lightenCanvas.toBlob(
								(blob) => {
									var reader = new FileReader()
									reader.onload = function (e) {
										//@ts-ignore
										var jpegData = piexif.insert(exifbytes, e.target.result)
										console.log("pushing jpeg")
										//@ts-ignore
										var imagesRef = ref(
											storageRef,
											`${group}/${new Date(date).toString()}`
										)
										uploadString(imagesRef, jpegData, "data_url")
										console.log(
											`uploaded to firebase ${group}/${new Date(
												date
											).toString()}`
										)

										// @ts-ignore
										imageJpeg.current.push({
											jpeg: jpegData,
											date,
											longestObject,
										})

										// reset canvases
										lightenContext.globalCompositeOperation = "source-over"
										differenceContext.globalCompositeOperation = "source-over"
										//@ts-ignore
										lightenContext.clearRect(0, 0, width, height)
										//@ts-ignore
										differenceContext.clearRect(0, 0, diffWidth, diffHeight)

										lightenContext.globalCompositeOperation =
											// @ts-ignore
											exposureTime.current < 10000 ? "lighter" : "lighten"
										differenceContext.globalCompositeOperation = "difference"
										count = 0
										isProcessing.current = false
									}
									reader.readAsDataURL(blob)
								},
								"image/jpeg",
								0.95
							)
						} else {
							fullcount++
							// reset canvases
							lightenContext.globalCompositeOperation = "source-over"
							differenceContext.globalCompositeOperation = "source-over"
							//@ts-ignore
							lightenContext.clearRect(0, 0, width, height)
							//@ts-ignore
							differenceContext.clearRect(0, 0, diffWidth, diffHeight)

							lightenContext.globalCompositeOperation =
								// @ts-ignore
								exposureTime.current < 10000 ? "lighter" : "lighten"
							differenceContext.globalCompositeOperation = "difference"
							count = 0
							isProcessing.current = false
						}
					}
					last = frame.timestamp
					frame.close()
					if (
						frameCount > START_FRAME &&
						frameCount % framesPerFourSeconds === 0
					) {
						const canvas = document.getElementById("debug")
						// @ts-ignore
						const ctx = canvas.getContext("2d", { willReadFrequently: true })
						ctx.drawImage(offScreenCanvasLighten.current, 0, 0, 302, 403)
						setFramesCaptured(
							// @ts-ignore
							Math.round((frameCount - START_FRAME) / framesPerFourSeconds)
						)
						// @ts-ignore
						setPhotosSaved(imageJpeg.current.length)
					}
					// @ts-ignore

					// 	// } else {
					// 	// 	imageJpeg.current.push(bitmap)
					// 	// 	console.log(`${last} pushed image`)
					// 	// }

					// console.log(`Time taken: ${Date.now() - startAlgo}`)
					// browser only seems to let you have 3 frames open
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
		// @ts-ignore
		videoPreview.srcObject = null
		const stream = streamRef.current

		// @ts-ignore
		const videoTracks = stream.getVideoTracks()
		console.log("stopping video")
		videoTracks.forEach((track) => {
			track.stop()
		})
		setIsRecording(false)
		onOpen()
		sleep(1000)
		setIsFinished(true)
	}

	const options = Object.values(TIMER_VALUES)

	const { getRootProps, getRadioProps } = useRadioGroup({
		name: "timer",
		defaultValue: selectedTimer,
		onChange: (t) => setSelectedTimer(t),
	})

	const group = getRootProps()

	// @ts-ignore
	// @ts-ignore
	async function lighterImageStackTest() {
		const images = [
			image1,
			image2,
			image3,
			// image4,
			// image5,
			// image6,
			// image7,
			// image8,
			// image9,
		]

		const canvas = document.getElementById("debug")

		const imgs = await Promise.all(images.map(loadImage))
		const bmps = await Promise.all(imgs.map((a) => createImageBitmap(a)))
		// @ts-ignore
		canvas.width = bmps[0].width
		// @ts-ignore
		canvas.height = bmps[0].height
		bmps.map((x) => {
			// @ts-ignore
			const ctx = canvas.getContext("2d")
			ctx.globalCompositeOperation = "lighten"

			ctx.drawImage(x, 0, 0)
		})
		console.log("Done")

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
			framesCaptured === numberOfImages * 4
		) {
			stopStreamedVideo()
			if (hasAlarm) {
				dingSound.play()
			}
		}
	}, [framesCaptured])

	// @ts-ignore
	let imageUrls = [image1, image2]
	class ImagePreview extends Component {
		componentDidMount() {
			var canvas = document.getElementById(
				`suggested-images-${this.props.index}`
			)
			// @ts-ignore
			var context = canvas.getContext("2d")
			const { longestObject, jpegUrl } = this.props
			if (jpegUrl && longestObject) {
				var imageObj = new Image()

				imageObj.onload = function () {
					context.drawImage(
						this,
						Math.min(
							//@ts-ignore
							this.width - 300,
							Math.max(0, longestObject.jstart * 3 - 100)
						),
						Math.min(
							//@ts-ignore
							this.height - 292,
							Math.max(0, longestObject.istart * 3 - 100)
						),
						300,
						292,
						0,
						0,
						300,
						292
					)
				}
				imageObj.src = jpegUrl
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

	// @ts-ignore
	async function testCompareImages() {
		const images = [
			image1,
			image2,
			image3,
			image4,
			// image5,
			// image6,
			// image7,
			// image8,
			// image9,
		]

		const canvas = document.getElementById("debug")
		// @ts-ignore
		const ctx = canvas.getContext("2d")

		// setup
		const img = await loadImage(images[0])
		const bitmapRef = await createImageBitmap(img)

		const diffWidth = bitmapRef.width / DOWNSAMPLE
		const diffHeight = bitmapRef.height / DOWNSAMPLE

		// @ts-ignore
		offScreenCanvasLighten.current.width = bitmapRef.width
		// @ts-ignore
		offScreenCanvasLighten.current.height = bitmapRef.height

		// @ts-ignore
		offScreenCanvasDifference.current.width = diffWidth
		// @ts-ignore
		offScreenCanvasDifference.current.height = diffHeight

		// @ts-ignore
		offScreenCanvasFirestore.current.width = bitmapRef.width
		// @ts-ignore
		offScreenCanvasFirestore.current.height = bitmapRef.height

		// @ts-ignore
		const lightenContext = offScreenCanvasLighten.current.getContext("2d", {
			willReadFrequently: true,
		})
		lightenContext.globalCompositeOperation = "lighten"

		// @ts-ignore
		const differenceContext = offScreenCanvasDifference.current.getContext(
			"2d",
			{ willReadFrequently: true }
		)
		differenceContext.globalCompositeOperation = "difference"

		// @ts-ignore
		// @ts-ignore
		const firestoreContext = offScreenCanvasFirestore.current.getContext("2d")
		imageJpeg.current = []
		// Process images
		Promise.all(images.map(loadImage))
			.then((imgs) => Promise.all(imgs.map((a) => createImageBitmap(a))))
			.then(async (x) => {
				const startAlgo = Date.now()

				// @ts-ignore
				// @ts-ignore
				x.map((bitmap, i) => {
					// return onBitmap(
					// 	bitmap,
					// 	i,
					// 	new Date(),
					// 	startAlgo,
					// 	lightenContext,
					// 	differenceContext
					// )
				})

				await sleep(1000)
				console.log(imageJpeg.current)
				if (imageJpeg.current.length > 0) {
					console.log(imageJpeg.current)
					// @ts-ignore
					const imgSrc = imageJpeg.current[0].jpeg

					var img = document.getElementById("debugImg")
					// @ts-ignore
					img.width = x[0].width
					// @ts-ignore
					img.height = x[0].height
					// @ts-ignore
					img.src = imgSrc
					// @ts-ignore
					ctx.drawImage(imageJpeg.current[0].difference, 0, 0)
				}

				const endAlgo = Date.now()
				console.log({ time: endAlgo - startAlgo })
			})
	}

	// @ts-ignore
	async function testLineAlgorithm() {
		const startAlgo = Date.now()
		const imageA = await loadImage(image1)
		console.log("LINE IS ~52px (/3 = ~17.3")
		const canvas = document.getElementById("debug")
		// @ts-ignore
		const ctx = canvas.getContext("2d", {
			willReadFrequently: true,
		})
		let width = imageA.width / 3
		let height = imageA.height / 3
		// @ts-ignore
		canvas.width = width
		// @ts-ignore
		canvas.height = height

		let imageData
		ctx.drawImage(imageA, 0, 0, width, height)
		imageData = ctx.getImageData(0, 0, width, height)
		const { longestObject } = lineAlgorithm(imageData, true)
		console.log(longestObject)
		// @ts-ignore
		const bitmap = await createImageBitmap(imageA)

		console.log(`Time taken: ${Date.now() - startAlgo}`)
		onOpen()
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
						// @ts-ignore
						var context = canvas.getContext("2d")
						// @ts-ignore
						context.clearRect(0, 0, canvas.width, canvas.height)
						// @ts-ignore
						canvas.width = 0
						// @ts-ignore
						canvas.height = 0
					}}
				>
					<ModalOverlay />
					<ModalContent>
						<ModalHeader>{`Suggested Photos ${
							imageJpeg.current.length
						} / ${Math.floor((framesCaptured || 1) / 4)}`}</ModalHeader>
						<ModalCloseButton />
						<ModalBody>
							<Stack spacing={5} id="suggestedFrames" width="100%">
								{imageJpeg.current.map(({ jpeg, longestObject }, i) => {
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
														jpegUrl={jpeg}
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
									// @ts-ignore
									var context = canvas.getContext("2d")
									// @ts-ignore
									context.clearRect(0, 0, canvas.width, canvas.height)
									// @ts-ignore
									canvas.width = 0
									// @ts-ignore
									canvas.height = 0
								}}
								mr={3}
							>
								Close
							</Button>
							<Button
								colorScheme="blue"
								isDisabled={
									imageJpeg.current.length === 0 ||
									!imageJpeg.current.find(
										(_, i) =>
											checkedItems[i] === undefined || checkedItems[i] === true
									)
								}
								onClick={() => {
									var canvas = document.getElementById("download")
									// @ts-ignore
									// @ts-ignore
									var context = canvas.getContext("2d")
									imageJpeg.current.map(({ jpeg, date }, i) => {
										if (checkedItems[i] == null || checkedItems[i] === true) {
											var anchor = document.createElement("a")
											anchor.href = jpeg
											anchor.download = `${new Date(date)
												.toString()
												// @ts-ignore
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
						SSA 310.1
					</Heading>
				</Flex>
				<Text maxWidth="320px" color="InfoText" fontSize="sm">
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
					width="320px"
					height={Math.min(320, VIEW_WIDTH)}
				>
					<Flex justify="center" width="100%">
						<video
							id="video-preview"
							width="238px"
							autoPlay
							playsInline
						></video>
					</Flex>
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
						// @ts-ignore
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
						// @ts-ignore
						onChange={({ target }) => {
							onOpen()
							console.log({ imageJpeg })
							//@ts-ignore
							setHasAlarm(target.value)
						}}
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
						// @ts-ignore
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
						minWidth="320px"
						colorScheme="blue"
						variant="solid"
						isDisabled={!isRecording}
						onClick={(e) => {
							setIsFinished(false)
							// @ts-ignore
							stopStreamedVideo(e)
						}}
					>
						Stop Recording
					</Button>
				) : (
					<Flex direction="column">
						{/* <Button
							mt="5px"
							colorScheme="blue"
							variant="solid"
							isDisabled={isRecording 
								//|| !serviceWorkerActive
							}
							onClick={(e) => {
								startRecording(e, true, 10000)
								setIsFinished(false)
								if (selectedTimer === TIMER_VALUES.duration) {
									setTimeout(() => {
										dingSound.play()
										stopStreamedVideo()
									}, (duration + 5) * 1000)
								}
							}}
						>
							Start Recording (Android Max)
						</Button> */}
						<Button
							mt="5px"
							minWidth="320px"
							colorScheme="blue"
							variant="solid"
							isDisabled={
								isRecording
								//|| !serviceWorkerActive
							}
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
							Start Recording
						</Button>
						<Button
							mt="5px"
							minWidth="320px"
							colorScheme="blue"
							variant="solid"
							isDisabled={
								isRecording
								//|| !serviceWorkerActive
							}
							onClick={(e) => {
								startRecording(e, true, 100, true)
								setIsFinished(false)
								if (selectedTimer === TIMER_VALUES.duration) {
									setTimeout(() => {
										dingSound.play()
										stopStreamedVideo()
									}, (duration + 5) * 1000)
								}
							}}
						>
							Start Recording (iPhone Simulation)
						</Button>
						{/* <Button
							mt="5px"
							ml="5px"
							colorScheme="blue"
							variant="solid"
							isDisabled={isRecording || !serviceWorkerActive}
							// @ts-ignore
							onClick={(e) => {
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
					onClick={(e) => {
						e.preventDefault()
						// lighterImageStackTest()
						testCompareImages()
					}}
				>
					Test compare Images
				</Button> */}
				{/* {!serviceWorkerActive && <Text fontSize="sm">{`Starting up...`}</Text>} */}
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
				<canvas id="download" height="0px"></canvas>
				<canvas id="debug" height="800px" width="600px"></canvas>
				{/* <canvas id="worker" height="0px"></canvas>
			
				<img id="debugImg" height="4032px" width="3024px" />

				<Flex justify="center" id="capturedFrames" w="100%">
					<canvas id="debug2" height="800px" width="600px"></canvas>
				</Flex>
				<Flex direction="column" id="capturedFrames" w="480px"></Flex> */}
			</header>
		</div>
	)
}

export { App, lineAlgorithm }
