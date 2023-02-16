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
import { compareImages } from "./compareImages"

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
			streamRef.current = stream
			handleSuccess(isAndroid, iso)
		} catch (e) {
			setIsRecording(false)
			console.error(e)
		}
	}

	async function handleSuccess(isAndroid = false, iso = 1000) {
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
		// let canvasB = document.createElement("canvas")

		// let canvasWorkerA = canvasA.transferControlToOffscreen()
		// let canvasWorkerB = canvasB.transferControlToOffscreen()

		// navigator.serviceWorker.controller.postMessage({ canvasA: canvasWorkerA }, [
		// 	canvasWorkerA,
		// ])

		// navigator.serviceWorker.controller.postMessage({ canvasB: canvasWorkerB }, [
		// 	canvasWorkerB,
		// ])

		// navigator.serviceWorker.onmessage = (e) => {
		// 	const message = e.data
		// 	console.log(`[From Worker]: ${message}`)
		// }

		const writableStream = new WritableStream(
			{
				write: async (frame) => {
					frameCount++
					if (frameCount > 5 && frame.timestamp > last) {
						const bitmap = await createImageBitmap(frame)
						last = frame.timestamp
						if (imageBMP.current.length) {
							const { score, result } = compareImages(
								canvasA,
								bitmap,
								imageBMP.current
									.slice(imageBMP.current.length - 1, imageBMP.current.length)
									.pop()
							)
							console.log({ score })

							if (score > 2000) {
								imageBMP.current.push(bitmap)
								console.log(`${last} pushed image`)
							}
						} else {
							imageBMP.current.push(bitmap)
							console.log(`${last} pushed image`)
						}
						// navigator.serviceWorker.controller.postMessage({
						// 	bitmap,
						// 	group: datestring,
						// })
						setPhotosSaved(imageBMP.current.length)
						setFramesCaptured(frameCount - 5)
					}
					// browser only seems to let you have 3 frames open
					setTimeout(() => frame.close(), 500)
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
			if (this.props.bitmap) {
				context.drawImage(this.props.bitmap, 0, 0, 300, 292)
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
		]

		const canvas = document.getElementById("debug")

		Promise.all(images.map(loadImage))
			.then((imgs) => Promise.all(imgs.map((a) => createImageBitmap(a))))
			.then((x) => {
				// console.log("Should Pass")
				// const { score: scoreA, result: resultA } = compareImages(
				// 	canvas,
				// 	x[0],
				// 	x[1]
				// )
				// console.log({ scoreA, resultA })

				// console.log("Should Pass")
				// const { score: scoreB, result: resultB } = compareImages(
				// 	canvas,
				// 	x[1],
				// 	x[2]
				// )
				// console.log({ scoreB, resultB })

				console.log("Should Pass")
				const { score: scoreC, result: resultC } = compareImages(
					canvas,
					x[2],
					x[3]
				)
				console.log({ scoreC, resultC })

				// console.log("Should Pass")
				// const { score: scoreD, result: resultD } = compareImages(
				// 	canvas,
				// 	x[4],
				// 	x[5]
				// )
				// console.log({ scoreD, resultD })

				// console.log("Should Pass")
				// const { score: scoreE, result: resultE } = compareImages(
				// 	canvas,
				// 	x[5],
				// 	x[6]
				// )
				// console.log({ scoreE, resultE })

				// console.log("Should Pass")
				// const { score: scoreF, result: resultF } = compareImages(
				// 	canvas,
				// 	x[6],
				// 	x[7]
				// )
				// console.log({ scoreF, resultF })

				// console.log("Should Pass")
				// const { score: scoreG, result: resultG } = compareImages(
				// 	canvas,
				// 	x[7],
				// 	x[8]
				// )
				// console.log({ scoreG, resultG })

				// console.log("Should Fail")
				// const { score: scoreFail, result: resultFail } = compareImages(
				// 	canvas,
				// 	x[0],
				// 	x[8]
				// )
				// console.log({ scoreFail, resultFail })

				// console.log("Done")
			})
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
								{imageBMP.current.map((bitmap, i) => {
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
									!Object.values(checkedItems).find(
										(x) => x === null || x === true
									)
								}
								onClick={() => {
									var canvas = document.getElementById("download")
									var context = canvas.getContext("2d")
									console.log(imageBMP.current)
									imageBMP.current.map((bmp, i) => {
										if (checkedItems[i] === null || checkedItems[i] === true) {
											console.log(bmp)
											canvas.width = bmp.width
											canvas.height = bmp.height
											context.drawImage(bmp, 0, 0)
											var anchor = document.createElement("a")
											anchor.href = canvas.toDataURL("image/jpeg")
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
						SSA 216.2
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
							Start Recording (TEST)
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
						// lighterImageStackTest()
						testCompareImages()
					}}
				>
					Test compare Images
				</Button>
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
				<Flex direction="column" id="capturedFrames" w="480px"></Flex>
			</header>
		</div>
	)
}

export { App }
