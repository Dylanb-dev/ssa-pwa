import React, { useState, useRef } from "react"
import logo from "./logo.jpg"
import sound from "./ding.mp3"
import image1 from "./test/1.png"
import image2 from "./test/2.png"
import { initializeApp } from "firebase/app"
import { getStorage, ref, uploadBytes } from "firebase/storage"

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
	NumberInput,
	NumberInputField,
	NumberInputStepper,
	NumberIncrementStepper,
	NumberDecrementStepper,
	FormControl,
	FormLabel,
	Switch,
} from "@chakra-ui/react"

const firebaseConfig = {
	apiKey: "AIzaSyBYAQRyqjZ-vjXT1FikWjmVNDpHe4tiyJs",

	authDomain: "space-exposure-d0379.firebaseapp.com",

	projectId: "space-exposure-d0379",

	storageBucket: "space-exposure-d0379.appspot.com",

	messagingSenderId: "963000608298",

	appId: "1:963000608298:web:985c5a76757cdd41f9c553",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
// Create a root reference
const storageRef = getStorage()

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
/**
 * @param {ImageBitmap} imageBitmapA
 * @param {ImageBitmap} imageBitmapB
 * @param {boolean} debug
 * @returns {{result: boolean, score: number, c}} myObj

 */
function compareImages(imageBitmapA, imageBitmapB, debug = false) {
	console.log("COMPARE IMAGES")
	console.log({ imageBitmapA, imageBitmapB })
	let width
	let height
	if (
		imageBitmapA.width === imageBitmapB.width &&
		imageBitmapA.height === imageBitmapB.height
	) {
		width = imageBitmapA.width
		height = imageBitmapB.width
	} else {
		console.error(
			`image A is ${imageBitmapA.width}x${imageBitmapA.height}px and image B is ${imageBitmapB.width}x${imageBitmapB.height}px so cannot compare`
		)
		return { result: false, score: 0 }
	}

	const canvas = document.createElement("canvas")
	canvas.width = width
	canvas.height = height

	const ctx = canvas.getContext("2d", {
		willReadFrequently: true,
	})
	ctx.globalCompositeOperation = "difference"
	ctx.drawImage(imageBitmapA, 0, 0)
	ctx.drawImage(imageBitmapB, 0, 0)
	let diff = ctx.getImageData(0, 0, width, height)

	var PIXEL_SCORE_THRESHOLD = 16
	var imageScore = 0

	for (var i = 0; i < diff.data.length; i += 4) {
		var r = diff.data[i] / 3
		var g = diff.data[i + 1] / 3
		var b = diff.data[i + 2] / 3
		var pixelScore = r + g + b
		if (pixelScore >= PIXEL_SCORE_THRESHOLD) {
			imageScore++
		}
	}
	console.log({ imageScore })
	if (imageScore > 0 && imageScore < 200000) {
		if (debug) {
			const capturedFrames = document.getElementById("capturedFrames")
			capturedFrames.appendChild(canvas)
		}
		return { result: true, score: imageScore }
	} else {
		return { result: false, score: 0 }
	}
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
	const [selectedTimer, setSelectedTimer] = useState(TIMER_VALUES.until_stopped)
	const [duration, setDuration] = useState(30)
	const [numberOfImages, setNumberOfImages] = useState(30)
	const [hasAlarm, setHasAlarm] = useState(true)
	const [hasCountdown, setHasCountdown] = useState(true)
	const [debugMessage, setDebugMessage] = useState("")

	const { isOpen, onOpen, onClose } = useDisclosure()

	const streamRef = useRef()
	const imageBMP = useRef([])
	const suggestedImages = useRef([])

	async function startRecording(e) {
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
			console.log(stream)
			streamRef.current = stream
			handleSuccess()
		} catch (e) {
			console.error(e)
		}
	}

	const datestring = new Date().toString()

	async function handleSuccess() {
		setIsRecording(true)
		console.log("handleSuccess")
		const stream = streamRef.current
		console.log(stream)
		const video = document.querySelector("#video-preview")
		video.srcObject = stream
		// // const rawVideo = document.querySelector('#video-raw');
		// // rawVideo.srcObject = stream;

		const [track] = stream.getVideoTracks()
		document.createElement("canvas")

		const capabilities = track.getCapabilities()
		const settings = track.getSettings()
		console.log("Capabilities: ", capabilities)
		console.log("Settings: ", settings)

		// Basic settings for all camera
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
					exposureTime: capabilities.exposureTime.max,
					whiteBalanceMode: "manual",
					colorTemperature: 3000,
				},
			],
		})

		// If ISO is suppored
		if (capabilities.iso) {
			await track.applyConstraints({
				advanced: [
					{
						iso: 1600,
					},
				],
			})
		}
		// If zoom is suppored
		if (capabilities.zoom) {
			await track.applyConstraints({
				advanced: [
					{
						zoom: capabilities.zoom.min,
					},
				],
			})
		}
		// If focus is suppored
		if (capabilities.focusDistance) {
			await track.applyConstraints({
				advanced: [
					{
						focusMode: "manual",
						focusDistance: capabilities.focusDistance.max,
					},
				],
			})
		}

		console.log("Settings: ", track.getSettings())
		// eslint-disable-next-line
		const readable = new MediaStreamTrackProcessor(track).readable

		// vars to control our read loop
		let last = 0
		let frameCount = 0

		const queuingStrategy = new CountQueuingStrategy({ highWaterMark: 1 })
		const writableStream = new WritableStream(
			{
				write: async (frame) => {
					frameCount++
					if (frameCount > 10 && frame.timestamp > last) {
						const bitmap = await createImageBitmap(frame)
						frameCount++
						last = frame.timestamp
						imageBMP.current.push({ bitmap, last })
						console.log(`${last} pushed image`)
					}
					// browser only seems to let you have 3 frames open
					frame.close()
				},
				close: () => console.log("stream closed"),
				abort: () => console.log("stream aborted"),
			},
			queuingStrategy
		)
		await readable.pipeTo(writableStream)
	}

	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms))
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

		onOpen(() => {
			console.log("OPENNED")
		})

		// Upload to firebase
		// const imageBMP2 = imageBMP.current.slice()
		// var imagesRef = ref(
		// 	storageRef,
		// 	`${datestring}/${frameCount}-${last}`
		// )
		// uploadBytes(imagesRef, bitmap).then((e) => {
		// 	frame.close()
		// 	console.log(e)
		// })
		console.log(`Number of frames captured: ${imageBMP.current.length}`)
		let imageBMPFiltered = imageBMP.current.reduce(
			(accumulator, { bitmap, last }, i) => {
				console.log(accumulator)
				console.log({ bitmap, last })

				if (i === 0) return accumulator
				let compare = compareImages(bitmap, imageBMP.current[i - 1].bitmap)
				if (compare.result) {
					return [
						...accumulator,
						{ ...imageBMP.current[i], score: compare.score },
					]
				} else {
					return accumulator
				}
			},
			[]
		)

		imageBMP.current.forEach(async ({ bitmap, last }, i) => {
			const canvas3 = document.createElement("canvas")
			canvas3.width = bitmap.width
			canvas3.height = bitmap.height
			const ctx2 = canvas3.getContext("bitmaprenderer")
			ctx2.transferFromImageBitmap(bitmap)
			const blob3 = await new Promise((res) => canvas3.toBlob(res))
			console.log(blob3)
			var imagesRef = ref(storageRef, `${datestring}/${i}-${last}`)
			await uploadBytes(imagesRef, blob3)
		})
		await sleep(3000)

		const suggestedFrames = document.getElementById("suggestedFrames")

		console.log({ imageBMPFiltered })
		console.log(`Number of frames suggested: ${imageBMPFiltered.length}`)
		const pinfo = document.createElement("p")
		pinfo.textContent = `Suggested Frames: ${imageBMPFiltered.length}/${imageBMP.current.length}`
		suggestedFrames.appendChild(pinfo)

		await new Promise((resolve, reject) =>
			imageBMPFiltered.forEach(async ({ bitmap, last, score }, i) => {
				console.log(suggestedFrames)
				const canvas2 = document.createElement("canvas")
				canvas2.width = bitmap.width
				canvas2.height = bitmap.height
				const ctx2 = canvas2.getContext("bitmaprenderer")
				ctx2.transferFromImageBitmap(bitmap)
				suggestedFrames.appendChild(canvas2)
				const p = document.createElement("p")
				p.textContent = `Difference score: ${score}`
				suggestedFrames.appendChild(p)
				if (i === imageBMPFiltered.length - 1) {
					resolve()
				}
			})
		)
	}

	const options = Object.values(TIMER_VALUES)

	const { getRootProps, getRadioProps } = useRadioGroup({
		name: "timer",
		defaultValue: selectedTimer,
		onChange: (t) => setSelectedTimer(t),
	})

	const group = getRootProps()
	const dingSound = new Audio(sound)

	return (
		<div className="App">
			<header className="App-header">
				<Modal isOpen={isOpen} onClose={onClose}>
					<ModalOverlay />
					<ModalContent>
						<ModalHeader>Suggested Photos</ModalHeader>
						<ModalCloseButton />
						<ModalBody>
							<Flex
								direction="column"
								id="suggestedFrames"
								width="320px"
							></Flex>
						</ModalBody>
						<ModalFooter>
							<Button variant="ghost" onClick={onClose}>
								Close
							</Button>
							<Button colorScheme="blue" mr={3} isDisabled>
								Save
							</Button>
						</ModalFooter>
					</ModalContent>
				</Modal>
				<Flex align="center" width="100%">
					<img src={logo} className="App-logo" alt="logo" />
					<Heading fontSize="6xl" colorScheme="blue">
						SSA
					</Heading>
				</Flex>
				<Text color="InfoText">{debugMessage}</Text>
				<Button
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
				</Button>
				<Box
					borderWidth="1px"
					borderRadius="lg"
					overflow="hidden"
					width="100%"
					height={Math.min(480 / 2, VIEW_WIDTH / 2)}
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
						min={10}
						max={1000}
						w="100%"
						color="blackAlpha.600"
						onChange={(e) => setNumberOfImages(e)}
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
					<Button
						mt="5px"
						colorScheme="blue"
						variant="solid"
						isDisabled={isRecording}
						onClick={(e) => {
							startRecording(e)
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
				)}
				<video id="video-raw" autoPlay playsInline></video>
				<Flex direction="column" id="capturedFrames" w="480px"></Flex>
			</header>
		</div>
	)
}

export { App, compareImages }
