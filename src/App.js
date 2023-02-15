import React, { useState, useRef, useEffect } from "react"
import logo from "./logo.jpg"
import sound from "./ding.mp3"
import image1 from "./test/1.png"
import image2 from "./test/2.png"

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
	const [isFinished, setIsFinished] = useState(false)
	const [selectedTimer, setSelectedTimer] = useState(TIMER_VALUES.image_limit)
	const [duration, setDuration] = useState(30)
	const [numberOfImages, setNumberOfImages] = useState(10)
	const [hasAlarm, setHasAlarm] = useState(true)
	const [hasCountdown, setHasCountdown] = useState(true)
	const [debugMessage, setDebugMessage] = useState("")
	const [framesCaptured, setFramesCaptured] = useState(null)
	const [imageBMPFiltered, setImageBMPFiltered] = useState([])

	const { isOpen, onOpen, onClose } = useDisclosure()

	const streamRef = useRef()
	const imageBMP = useRef([])
	const suggestedImages = useRef([])

	async function startRecording(e, isAndroid = false, iso = 400) {
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
			console.log(stream)
			streamRef.current = stream
			handleSuccess(isAndroid, iso)
		} catch (e) {
			setIsRecording(false)
			console.error(e)
		}
	}

	async function handleSuccess(isAndroid = false, iso = 400) {
		setFramesCaptured(0)
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
		if (
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
						frameRate: Math.max(3, capabilities.frameRate.min),
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
		let canvasB = document.createElement("canvas")
		let canvasWorker = canvasB.transferControlToOffscreen()

		navigator.serviceWorker.controller.postMessage({ canvas: canvasWorker }, [
			canvasWorker,
		])

		const writableStream = new WritableStream(
			{
				write: async (frame) => {
					frameCount++
					if (frameCount > 10 && frame.timestamp > last) {
						const bitmap = await createImageBitmap(frame)
						last = frame.timestamp
						imageBMP.current.push(bitmap)
						navigator.serviceWorker.controller.postMessage({
							bitmap,
							group: datestring,
						})
						setFramesCaptured(frameCount - 10)
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

		// onOpen()
		// sleep(1000)
		renderPhotos()
		setIsFinished(true)
	}

	async function renderPhotos() {
		// await new Promise((resolve, reject) => {
		// 	setImageBMPFiltered(
		// 		imageBMP.current.reduce(async (accumulator, { bitmap }, i) => {
		// 			console.log(accumulator)
		// 			console.log({ bitmap })
		// 			if (i === 0) return accumulator
		// 			let compare = compareImages(bitmap, imageBMP.current[i - 1].bitmap)
		// 			if (compare.result) {
		// 				if (i === imageBMP.current.length - 1) {
		// 					resolve()
		// 					return [
		// 						...accumulator,
		// 						{ ...imageBMP.current[i], score: compare.score },
		// 					]
		// 				} else {
		// 					return [
		// 						...accumulator,
		// 						{ ...imageBMP.current[i], score: compare.score },
		// 					]
		// 				}
		// 			} else {
		// 				if (i === imageBMP.current.length - 1) {
		// 					resolve()
		// 					return accumulator
		// 				} else {
		// 					return accumulator
		// 				}
		// 			}
		// 		}, [])
		// 	)
		// })
		// console.log({ imageBMPFiltered })
		// imageBMP.current.forEach(async ({ bitmap, last }, i) => {
		// 	const canvas3 = document.createElement("canvas")
		// 	canvas3.width = bitmap.width
		// 	canvas3.height = bitmap.height
		// 	const ctx2 = canvas3.getContext("bitmaprenderer")
		// 	ctx2.transferFromImageBitmap(bitmap)
		// 	const blob3 = await new Promise((res) => canvas3.toBlob(res, 'image/jpeg', 0.9))
		// 	console.log(blob3)
		// 	var imagesRef = ref(storageRef, `${datestring}/${i}-${last}`)
		// 	await uploadBytes(imagesRef, blob3)
		// })
		// const suggestedFrames = document.getElementById("suggestedFrames")
		// console.log({ imageBMPFiltered })
		// console.log(`Number of frames suggested: ${imageBMPFiltered.length}`)
		// const pinfo = document.createElement("p")
		// pinfo.textContent = `Suggested Frames: ${imageBMPFiltered.length}/${imageBMP.current.length}`
		// suggestedFrames.appendChild(pinfo)
		// await new Promise((resolve, reject) =>
		// 	imageBMPFiltered.forEach(async ({ bitmap, last, score }, i) => {
		// 		console.log(suggestedFrames)
		// 		const canvas2 = document.createElement("canvas")
		// 		canvas2.width = bitmap.width
		// 		canvas2.height = bitmap.height
		// 		const ctx2 = canvas2.getContext("bitmaprenderer")
		// 		ctx2.transferFromImageBitmap(bitmap)
		// 		suggestedFrames.appendChild(canvas2)
		// 		const p = document.createElement("p")
		// 		p.textContent = `Difference score: ${score}`
		// 		suggestedFrames.appendChild(p)
		// 		if (i === imageBMPFiltered.length - 1) {
		// 			await sleep(1000)
		// 			resolve()
		// 		}
		// 	})
		// )
		// await new Promise((resolve, reject) =>
		// 	imageBMP.current.forEach(async ({ bitmap, last }, i) => {
		// 		console.log(suggestedFrames)
		// 		const canvas2 = document.createElement("canvas")
		// 		canvas2.width = bitmap.width
		// 		canvas2.height = bitmap.height
		// 		const ctx2 = canvas2.getContext("bitmaprenderer")
		// 		ctx2.transferFromImageBitmap(bitmap)
		// 		suggestedFrames.appendChild(canvas2)
		// 		if (i === imageBMP.current.length - 1) {
		// 			await sleep(1000)
		// 			resolve()
		// 		}
		// 	})
		// )
	}

	const options = Object.values(TIMER_VALUES)

	const { getRootProps, getRadioProps } = useRadioGroup({
		name: "timer",
		defaultValue: selectedTimer,
		onChange: (t) => setSelectedTimer(t),
	})

	const group = getRootProps()
	const dingSound = new Audio(sound)

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

	useEffect(() => {
		onOpen()
	}, [])

	return (
		<div className="App">
			<header className="App-header">
				<Modal isOpen={isOpen} onClose={onClose}>
					<ModalOverlay />
					<ModalContent>
						<ModalHeader>Suggested Photos</ModalHeader>
						<ModalCloseButton />
						<ModalBody>
							<Stack spacing={5} id="suggestedFrames" width="100%">
								<Checkbox defaultChecked width="100%">
									<Box width="100%" height="200px" backgroundColor="blue">
										test
									</Box>
								</Checkbox>
								<Checkbox
									defaultChecked
									width="100%"
									onChange={() => setSelectedImages([1])}
								>
									<Box width="100%" height="200px" backgroundColor="blue">
										test
									</Box>
								</Checkbox>
								<Checkbox defaultChecked width="100%">
									<Box width="100%" height="200px" backgroundColor="blue">
										test
									</Box>
								</Checkbox>
							</Stack>
						</ModalBody>
						<ModalFooter>
							<Button variant="ghost" onClick={onClose} mr={3}>
								Close
							</Button>
							<Button
								colorScheme="blue"
								isDisabled={selectedImages.length === 0}
							>
								Save
							</Button>
						</ModalFooter>
					</ModalContent>
				</Modal>
				<Flex align="center" width="100%">
					<img src={logo} className="App-logo" alt="logo" />
					<Heading fontSize="6xl" colorScheme="blue">
						SSA feb15.5
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
								startRecording(e, true, 400)
								setIsFinished(false)
								if (selectedTimer === TIMER_VALUES.duration) {
									setTimeout(() => {
										dingSound.play()
										stopStreamedVideo()
									}, (duration + 5) * 1000)
								}
							}}
						>
							Start Recording (Android 400)
						</Button>
						<Button
							mt="5px"
							colorScheme="blue"
							variant="solid"
							isDisabled={isRecording}
							onClick={(e) => {
								startRecording(e, true, 800)
								setIsFinished(false)
								if (selectedTimer === TIMER_VALUES.duration) {
									setTimeout(() => {
										dingSound.play()
										stopStreamedVideo()
									}, (duration + 5) * 1000)
								}
							}}
						>
							Start Recording (Android 800)
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
							ml="5px"
							colorScheme="blue"
							variant="solid"
							isDisabled={isRecording}
							onClick={(e) => {
								startRecording(e, false)
								setIsFinished(false)
								if (selectedTimer === TIMER_VALUES.duration) {
									setTimeout(() => {
										dingSound.play()
										stopStreamedVideo()
									}, (duration + 5) * 1000)
								}
							}}
						>
							Start Recording (iPhone)
						</Button>
					</Flex>
				)}
				{framesCaptured !== null && (
					<Text fontSize="sm">{`Photos taken: ${framesCaptured}`}</Text>
				)}
				{isFinished && (
					<Text
						fontSize="sm"
						colorScheme="red"
					>{`Finished Recording Successfully`}</Text>
				)}
				<video id="video-raw" autoPlay playsInline></video>
				<canvas id="worker"></canvas>

				<Flex direction="column" id="capturedFrames" w="480px"></Flex>
			</header>
		</div>
	)
}

export { App, compareImages }
