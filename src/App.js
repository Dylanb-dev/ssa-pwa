import React, { useState, useRef, useEffect, Component } from "react"
import logo from "./logo.jpg"
import sound from "./ding.mp3"

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
	const [checkedItems, setCheckedItems] = React.useState({})

	const { isOpen, onOpen, onClose } = useDisclosure()

	const streamRef = useRef()
	const imageBMP = useRef([])
	const suggestedImages = useRef([])

	async function startRecording(e, isAndroid = false, iso = 1000) {
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

	async function handleSuccess(isAndroid = false, iso = 1000) {
		setFramesCaptured(0)
		console.log("handleSuccess")
		const stream = streamRef.current
		console.log(stream)
		const video = document.querySelector("#video-preview")
		video.srcObject = stream

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

		let canvasA = document.createElement("canvas")
		let canvasB = document.createElement("canvas")

		let canvasWorkerA = canvasA.transferControlToOffscreen()
		let canvasWorkerB = canvasB.transferControlToOffscreen()

		navigator.serviceWorker.controller.postMessage({ canvasA: canvasWorkerA }, [
			canvasWorkerA,
		])

		navigator.serviceWorker.controller.postMessage({ canvasB: canvasWorkerB }, [
			canvasWorkerB,
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
		// imageA.src

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
		// imageB.src
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

	useEffect(() => {
		onOpen()
	}, [])

	let imageUrls = [image1, image2]
	class ImagePreview extends Component {
		componentDidMount() {
			console.log(this.props)
			var canvas = document.getElementById(
				`suggested-images-${this.props.index}`
			)
			var context = canvas.getContext("2d")

			// load image from data url
			var imageObj = new Image()
			imageObj.onload = function () {
				context.drawImage(this, 0, 0, 350, 450)
			}
			console.log(imageObj)
			imageObj.src = this.props.url
		}

		shouldComponentUpdate(nextProps) {
			return this.props.url !== nextProps.url
		}

		render() {
			return (
				<canvas height="400px" id={`suggested-images-${this.props.index}`} />
			)
		}
	}

	console.log("render")

	const handleSelectedImage = (e, i) => {
		setCheckedItems({ [i]: e.target.checked })
	}

	console.log(checkedItems)

	return (
		<div className="App">
			<header className="App-header">
				<Modal
					isOpen={isOpen}
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
						<ModalHeader>Suggested Photos</ModalHeader>
						<ModalCloseButton />
						<ModalBody>
							<Stack spacing={5} id="suggestedFrames" width="100%">
								{imageUrls.map((url, i) => {
									console.log("RENDER")
									return (
										<Flex key={`checkbox-${i}`}>
											<Checkbox
												defaultChecked
												width="100%"
												isChecked={checkedItems[i]}
												height="400px"
												onChange={(e) => handleSelectedImage(e, i)}
											>
												<Box width="100%" height="400px">
													<ImagePreview height="400px" url={url} index={i} />
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
								onClick={() => {
									var canvas = document.getElementById("download")
									var context = canvas.getContext("2d")
									imageUrls.map((url, i) => {
										// load image from data url
										var imageObj = new Image()
										imageObj.onload = function () {
											canvas.width = this.width
											canvas.height = this.height
											context.drawImage(this, 0, 0)
											var anchor = document.createElement("a")
											anchor.href = canvas.toDataURL("image/png")
											anchor.download = `${url}`
											anchor.click()
										}
										imageObj.src = url
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
						SSA 216.1
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
								startRecording(e, true, 3200)
								setIsFinished(false)
								if (selectedTimer === TIMER_VALUES.duration) {
									setTimeout(() => {
										dingSound.play()
										stopStreamedVideo()
									}, (duration + 5) * 1000)
								}
							}}
						>
							Start Recording (Android 3200)
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
				<Button
					mt="5px"
					colorScheme="blue"
					variant="solid"
					isDisabled={isRecording}
					onClick={(e) => {
						e.preventDefault()
						lighterImageStackTest()
					}}
				>
					Test lighter image stacking
				</Button>
				{framesCaptured !== null && (
					<Text fontSize="sm">{`Photos taken: ${framesCaptured}`}</Text>
				)}
				{isFinished && (
					<Text
						fontSize="sm"
						colorScheme="red"
					>{`Finished Recording Successfully`}</Text>
				)}
				<canvas id="worker"></canvas>
				<canvas id="download"></canvas>
				<Flex direction="column" id="capturedFrames" w="480px"></Flex>
			</header>
		</div>
	)
}

export { App }
