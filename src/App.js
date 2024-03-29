// @ts-nocheck
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
import matt3 from "./test/matt3.jpeg"
// @ts-ignore
import algoRef from "./test/algoRef.jpeg"
// @ts-ignore
import algoRefLine from "./test/algoRefLine.jpeg"
// @ts-ignore
import { compareImages } from "./compareImages"
import { format } from "date-fns"

import piexif from "./piexifjs"
import { createIcon } from "@chakra-ui/icons"
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
	IconButton,
} from "@chakra-ui/react"
// @ts-ignore
import { getStorage, ref, uploadString } from "firebase/storage"
import { initializeApp } from "firebase/app"

import { ReactComponent as BellOff } from "./icons/bell-off.svg"
import { ReactComponent as BellRinging } from "./icons/bell-ringing.svg"
import { ReactComponent as Pictures } from "./icons/pictures.svg"
import { ReactComponent as Settings } from "./icons/settings.svg"
import { ReactComponent as UploadPhoto } from "./icons/upload-photo.svg"

import { ReactComponent as Shutter } from "./shutter/ic_shutter_normal.svg"
import { ReactComponent as ShutterPressed } from "./shutter/ic_shutter_pressed.svg"
import { ReactComponent as ShutterRecording } from "./shutter/ic_shutter_recording.svg"

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

// const UploadIcon = createIcon(UploadPhoto)

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
	const dingSound = new Audio(sound)

	const [isRecording, setIsRecording] = useState(false)

	const [isFinished, setIsFinished] = useState(false)
	const [selectedTimer, setSelectedTimer] = useState(TIMER_VALUES.duration)
	const [duration, setDuration] = useState(600)
	const [numberOfImages, setNumberOfImages] = useState(5)
	const [hasPreview, setHasPreview] = useState(false)
	// @ts-ignore
	const [serviceWorkerActive, setServiceWorkerActive] = useState(false)

	const [hasAlarm, setHasAlarm] = useState(true)
	const [hasDetectionAlarm, setHasDetectionAlarm] = useState(false)
	// @ts-ignore
	// @ts-ignore
	const [hasCountdown, setHasCountdown] = useState(true)
	const [debugMessage, setDebugMessage] = useState(" ")
	const [framesCaptured, setFramesCaptured] = useState(0)
	const [photosSaved, setPhotosSaved] = useState(0)
	const [showWebsite, setShowWebsite] = useState(false)
	const [checkedItems, setCheckedItems] = React.useState({})
	const {
		isOpen: isGalleryOpen,
		onOpen: onOpenGallery,
		onClose: onCloseGallery,
	} = useDisclosure()
	const {
		isOpen: isSettingsOpen,
		onOpen: onOpenSettings,
		onClose: onCloseSettings,
	} = useDisclosure()
	const {
		isOpen: isAlarmOpen,
		onOpen: onOpenAlarm,
		onClose: onCloseAlarm,
	} = useDisclosure()

	const streamRef = useRef()
	const imageJpeg = useRef([])
	// @ts-ignore
	const bmpStack = useRef([])

	const offScreenCanvasLighten = useRef()
	// @ts-ignore
	const offScreenCanvasLighter = useRef()
	const offScreenCanvasDifference = useRef()
	const offScreenCanvasFirestore = useRef()
	const videoDimensions = useRef({
		width: 0,
		height: 0,
		diffHeight: 0,
		diffWidth: 0,
	})
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

	async function startCamera() {
		setHasPreview(true)
		setDebugMessage("")
		const constraints = {
			audio: false,
			// video: true
			video: {
				facingMode: "environment",
				width: { ideal: 3500 },
				height: { ideal: 4500 },
				resizeMode: { ideal: "none" },
				frameRate: { ideal: 10 },
			},
		}
		try {
			// const readyServiceWorker = await navigator.serviceWorker.ready
			const stream = await navigator.mediaDevices.getUserMedia(constraints)
			// @ts-ignore
			streamRef.current = stream
			handleSuccess()
		} catch (e) {
			setIsRecording(false)
			console.error(e)
		}
	}

	useEffect(() => {
		startCamera()
	}, [])

	async function handleSuccess() {
		setHasPreview(true)

		// @ts-ignore
		console.log(streamRef.current)
		imageJpeg.current = []
		console.log("handleSuccess")
		const stream = streamRef.current
		const video = document.querySelector("#video-preview")
		// @ts-ignore
		video.srcObject = stream

		// @ts-ignore
		const [track] = stream.getVideoTracks()
		console.log({ track })

		const capabilities = track.getCapabilities()
		const settings = track.getSettings()

		videoDimensions.current = {
			width: settings.width,
			height: settings.height,
			diffWidth: Math.floor(settings.width / 3),
			diffHeight: Math.floor(settings.height / 3),
		}

		if (
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
			let iso = capabilities.iso.min

			if (maxExposure >= 5000) {
				// @ts-ignore
				exposureTime.current = 5000
				iso = Math.min(1600, capabilities.iso.max)
			} else if (maxExposure >= 1000) {
				// @ts-ignore
				exposureTime.current = 1000
				iso = Math.min(1600, capabilities.iso.max)
			}
			await track.applyConstraints({
				advanced: [
					{
						exposureMode: "manual",
						whiteBalanceMode: "manual",
						focusMode: "manual",
						iso: Math.min(iso, capabilities.iso.max),
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
					},
				],
			})
		} else if (capabilities.exposureMode) {
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
	}

	async function startRecording() {
		setIsRecording(true)
		const stream = streamRef.current
		// @ts-ignore
		console.log({ stream })
		// @ts-ignore
		const [track] = stream.getVideoTracks()
		console.log({ track })

		document.createElement("canvas")

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

		// Emulated exposure time (stacking 1600 ISO frames)
		const EXPOSURE_TIME = 50000
		// vars to control our read loop
		// @ts-ignore
		let framesPerFourSeconds = Math.round(EXPOSURE_TIME / exposureTime.current)
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
		let frameRecorded = 0
		let count = -START_FRAME - 1
		// const sw = await navigator.serviceWorker.ready
		// const serviceWorker = sw.active
		const writableStream = new WritableStream(
			{
				write: (frame) => {
					frameCount++
					count++
					if (frameCount === START_FRAME) {
						console.log("START_FRAME")
						last = frame.timestamp
						frame.close()

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
						offScreenCanvasLighten.current.width = videoDimensions.current.width
						// @ts-ignore
						offScreenCanvasLighten.current.height =
							videoDimensions.current.height
						//@ts-ignore
						offScreenCanvasDifference.current = document.createElement("canvas")
						// @ts-ignore
						offScreenCanvasDifference.current.width =
							videoDimensions.current.diffWidth
						// @ts-ignore
						offScreenCanvasDifference.current.height =
							videoDimensions.current.diffHeight
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

						// firestoreContext = offScreenCanvasFirestore.current.getContext("2d")}

						// 	// Startup frames
						count++
					} else if (
						frameCount > START_FRAME &&
						frame.timestamp > last &&
						count % framesPerFourSeconds !== 0 &&
						!isProcessing.current
					) {
						console.log("DRAW")
						// @ts-ignore
						let startAlgo = Date.now()
						last = frame.timestamp
						const bitmap = frame
						// bmpStack.current.push(bitmap)
						console.log({ differenceContext, lightenContext })
						differenceContext.drawImage(
							bitmap,
							0,
							0,
							videoDimensions.current.diffWidth,
							videoDimensions.current.diffHeight
						)
						lightenContext.drawImage(bitmap, 0, 0)
						bitmap.close()
						console.log(`time taken =  ${Date.now() - startAlgo}`)
					} else if (
						frameCount > START_FRAME &&
						frame.timestamp > last &&
						count % framesPerFourSeconds === 0 &&
						!isProcessing.current
					) {
						console.log("COUNT % FRAMECOUNT")
						isProcessing.current = true
						fullcount++
						frameRecorded++
						setFramesCaptured(frameRecorded)
						const { width, height, diffWidth, diffHeight } =
							videoDimensions.current

						differenceContext.drawImage(frame, 0, 0, diffWidth, diffHeight)
						lightenContext.drawImage(frame, 0, 0)

						frame.close()

						const date = new Date()
						const lightenCanvas = offScreenCanvasLighten.current
						// @ts-ignore
						const differenceCanvas = offScreenCanvasDifference.current
						// console.log(differenceContext)
						const imageData = differenceContext.getImageData(
							0,
							0,
							diffWidth,
							diffHeight
						)
						const { longestObject } = lineAlgorithm(imageData)
						console.log({ longestObject })
						// Streak found, create final image
						if (longestObject.size > 5 && longestObject.size < 500) {
							// if (longestObject.size > 5 && longestObject.size < 500) {
							setPhotosSaved(imageJpeg.current.length)

							if (hasDetectionAlarm) {
								dingSound.play()
							}
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
							setPhotosSaved(imageJpeg.current.length)
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
					} else {
						last = frame.timestamp
						frame.close()
					}
					// @ts-ignore
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
		onOpenGallery()
	}
	console.log({ hasAlarm, hasDetectionAlarm })
	return (
		<div className="App">
			<header className="App-header">
				<Modal
					isOpen={isGalleryOpen}
					scrollBehavior="inside"
					onClose={() => {
						onCloseGallery()
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
						<ModalHeader>{`Suggested Photos ${imageJpeg.current.length} / ${framesCaptured}`}</ModalHeader>
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
									onCloseGallery()
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
				<Modal
					isOpen={isSettingsOpen}
					onClose={() => {
						onCloseSettings()
					}}
				>
					<ModalOverlay />
					<ModalContent>
						<ModalHeader>{`Adjust Capture Settings`}</ModalHeader>
						<ModalCloseButton />
						<ModalBody>
							<Stack {...group} p="4px">
								{options.map((value) => {
									const radio = getRadioProps({ value })
									return (
										<RadioCard key={value} {...radio}>
											{value}
										</RadioCard>
									)
								})}
							</Stack>
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
							<FormControl display="flex" alignItems="center">
								<FormLabel
									htmlFor="countdown"
									mb="0"
									color="#2D3748"
									// @ts-ignore
									onChange={({ target }) => setHasCountdown(target.checked)}
									my="8px"
								>
									5 second timer before start
								</FormLabel>
								<Switch id="countdown" defaultChecked={hasCountdown} />
							</FormControl>
						</ModalBody>
						<ModalFooter>
							<Button
								variant="ghost"
								onClick={() => {
									onCloseSettings()
								}}
								mr={3}
							>
								Close
							</Button>
						</ModalFooter>
					</ModalContent>
				</Modal>
				<Modal
					isOpen={isAlarmOpen}
					onClose={() => {
						onCloseAlarm()
					}}
				>
					<ModalOverlay />
					<ModalContent>
						<ModalHeader>{`Adjust Alarm`}</ModalHeader>
						<ModalCloseButton />
						<ModalBody>
							<FormControl
								display="flex"
								alignItems="center"
								color="#2D3748"
								// @ts-ignore
								onChange={({ target }) => {
									//@ts-ignore
									setHasAlarm(target.checked)
								}}
								my="8px"
							>
								<FormLabel htmlFor="alarm" mb="0">
									Alarm when finished
								</FormLabel>
								<Switch id="alarm" defaultChecked={hasAlarm} />
							</FormControl>
							<FormControl
								display="flex"
								alignItems="center"
								color="#2D3748"
								// @ts-ignore
								onChange={({ target }) => {
									//@ts-ignore
									setHasDetectionAlarm(target.checked)
								}}
								my="8px"
							>
								<FormLabel htmlFor="alarm" mb="0">
									Alarm when detected streak
								</FormLabel>
								<Switch id="alarm" defaultChecked={hasDetectionAlarm} />
							</FormControl>
						</ModalBody>
						<ModalFooter>
							<Button
								variant="ghost"
								onClick={() => {
									onCloseAlarm()
								}}
								mr={3}
							>
								Close
							</Button>
						</ModalFooter>
					</ModalContent>
				</Modal>
				{showWebsite ? (
					<></>
				) : (
					<Flex
						alignItems="center"
						width="100%"
						height="64px"
						px="16px"
						mt="8px"
					>
						<img src={logo} className="App-logo" alt="logo" />
						<Flex direction="column">
							<Heading fontSize="2xl">SatTrack</Heading>
							<Text fontSize="10px">v418.1</Text>
						</Flex>
						<Text maxWidth="320px" color="InfoText" fontSize="sm">
							{debugMessage}
						</Text>
					</Flex>
				)}
				{showWebsite ? (
					<Box width="100vw">
						<iframe
							style={{
								transform: "scale(0.8)",
								transformOrigin: "0 0",
							}}
							className="frame"
							height="125%"
							width="125%"
							src="https://d1e7enq0s1epae.cloudfront.net/"
						/>
					</Box>
				) : (
					<Flex
						direction="column"
						justify="center"
						width="100%"
					>
						<Flex justify="center" width="100%" height="100%">
							<video
								id="video-preview"
								width="100%"
								height="100%"
								autoPlay
								playsInline
							></video>
						</Flex>
						<audio />
						{hasPreview ? (
							<></>
						) : (
							<Text colorScheme="blue">Image preview here</Text>
						)}
					</Flex>
				)}
				<Box>
				<Flex height="16px" align="center" justify="space-around" width="100%" mb="-8px">
					<Text height="16px" fontSize="sm" mr="16px">{`Exp 5s. ISO1600`}</Text>
					<Text
						height="16px"
						fontSize="sm"
					>{`Photos taken: ${photosSaved} / ${framesCaptured}`}</Text>
				</Flex>
				<Flex
					align="center"
					width="100%"
					height="80px"
					justify="space-between"
					mx="8px"
				>
					<IconButton
						aria-label="Show website for image analysis"
						width="64px"
						height="64px"
						variant={"solid"}
						padding="12px"
						backgroundColor="transparent"
						onClick={(e) => {
							e.preventDefault()
							if (showWebsite) {
								setShowWebsite(false)
								startCamera()
							} else {
								stopStreamedVideo()
								setShowWebsite(true)
							}
						}}
						icon={<UploadPhoto />}
					/>
					<IconButton
						aria-label="Open Gallery of captured images"
						width="64px"
						height="64px"
						padding="12px"
						variant={"solid"}
						backgroundColor="transparent"
						onClick={(e) => {
							e.preventDefault()
							onOpenGallery()
						}}
						icon={<Pictures />}
					/>

					<IconButton
						aria-label="Take photos"
						width="102px"
						height="102px"
						variant={"solid"}
						backgroundColor="transparent"
						onClick={(e) => {
							e.preventDefault()
							let photoTimeOut
							if (isRecording) {
								stopStreamedVideo()
								//@ts-ignore
								if (photoTimeOut && photoTimeOut.clear) {
									//@ts-ignore
									photoTimeOut.clear()
								}
							} else {
								startRecording()
								setIsFinished(false)
								if (selectedTimer === TIMER_VALUES.duration) {
									photoTimeOut = setTimeout(() => {
										if (hasAlarm) {
											dingSound.play()
										}
										stopStreamedVideo()
									}, (duration + 5) * 1000)
								}
							}
						}}
						icon={isRecording ? <ShutterRecording /> : <Shutter />}
					/>
					<IconButton
						aria-label="Adjust settings"
						width="64px"
						height="64px"
						padding="14px"
						variant={"solid"}
						backgroundColor="transparent"
						onClick={(e) => {
							e.preventDefault()
							onOpenSettings()
						}}
						icon={<Settings />}
					/>
					<IconButton
						aria-label="Adjust alarm"
						width="64px"
						height="64px"
						padding="14px"
						variant={"solid"}
						backgroundColor="transparent"
						onClick={(e) => {
							e.preventDefault()
							onOpenAlarm()
						}}
						icon={hasDetectionAlarm || hasAlarm ? <BellRinging /> : <BellOff />}
					/>
				</Flex>
				<canvas id="download" height="0px"></canvas>
				</Box>
				{/* 
			
				{/* {!serviceWorkerActive && <Text fontSize="sm">{`Starting up...`}</Text>} */}

				{/* {isFinished && (
					<Text
						fontSize="sm"
						colorScheme="red"
					>{`Finished Recording Successfully`}</Text>
				)} */}
				{/* 

				<Flex justify="center" id="capturedFrames" w="100%">
					<canvas id="debug" height="600px" width="600px"></canvas>
					<canvas id="debug2" height="600px" width="600px"></canvas>
				</Flex> */}
				{/* <canvas id="worker" height="0px"></canvas>
			
				<img id="debugImg" height="4032px" width="3024px" />

			
				<Flex direction="column" id="capturedFrames" w="480px"></Flex> */}
			</header>
		</div>
	)
}

export { App, lineAlgorithm }
