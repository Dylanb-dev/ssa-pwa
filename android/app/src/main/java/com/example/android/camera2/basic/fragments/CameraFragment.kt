/*
 * Copyright 2020 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.example.android.camera2.basic.fragments

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.*
import android.graphics.drawable.ColorDrawable
import android.hardware.camera2.*
import android.media.ExifInterface
import android.media.Image
import android.media.ImageReader
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.text.Editable
import android.util.Log
import android.view.*
import android.webkit.WebView
import android.widget.*
import androidx.annotation.RequiresApi
import androidx.core.graphics.drawable.toDrawable
import androidx.core.net.toUri
import androidx.core.view.WindowInsetsCompat
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.lifecycle.Observer
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavController
import androidx.navigation.Navigation
import androidx.navigation.fragment.navArgs
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.android.camera.utils.OrientationLiveData
import com.example.android.camera.utils.computeExifOrientation
import com.example.android.camera.utils.decodeExifOrientation
import com.example.android.camera.utils.getPreviewOutputSize
import com.example.android.camera2.basic.CameraActivity
import com.example.android.camera2.basic.R
import com.example.android.camera2.basic.databinding.FragmentCameraBinding
import com.google.firebase.ktx.Firebase
import com.google.firebase.storage.ktx.storage
import com.google.firebase.storage.ktx.storageMetadata
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONObject
import org.json.JSONTokener
import java.io.*
import java.lang.Integer.parseInt
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ArrayBlockingQueue
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt


class CameraFragment : Fragment() {
    /** Android ViewBinding */
    private var _fragmentCameraBinding: FragmentCameraBinding? = null
    private val fragmentCameraBinding get() = _fragmentCameraBinding!!

    private val DURATION = "duration"
    private val NUMBER_OF_PHOTOS = "number_of_photos"
    private val UNTIL_STOPPED = "until_stopped"
    private var selectedCapture = DURATION

    private var durationTime = 600
    private var numberOfPhotos = 10
    private var countDownTimer = true
    private var hasAlarm = false
    private var hasDetectionAlarm = false

    private var photosTaken = 0
    private var photosCaptured = 0

    /** AndroidX navigation arguments */
    private val args: CameraFragmentArgs by navArgs()

    /** Host's navigation controller */
    private val navController: NavController by lazy {
        Navigation.findNavController(requireActivity(), R.id.fragment_container)
    }

    /** Detects, characterizes, and connects to a CameraDevice (used for all camera operations) */
    private val cameraManager: CameraManager by lazy {
        val context = requireContext().applicationContext
        context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    }

    /** [CameraCharacteristics] corresponding to the provided Camera ID */
    private val characteristics: CameraCharacteristics by lazy {
        cameraManager.getCameraCharacteristics(args.cameraId)
    }

    /** Readers used as buffers for camera still shots */
    private lateinit var imageReader: ImageReader

    /** Popup menu for adjusting capture settings */
    private lateinit var popupMenuSettings: PopupMenu

    /** Popup menu for adjusting alarm settings */
    private lateinit var popupMenuAlarm: PopupMenu

    /** [HandlerThread] where all camera operations run */
    private val cameraThread = HandlerThread("CameraThread").apply { start() }

    /** [Handler] corresponding to [cameraThread] */
    private val cameraHandler = Handler(cameraThread.looper)

    /** Performs recording animation of flashing screen */
    private val animationTask: Runnable by lazy {
        Runnable {
            // Flash white animation
            fragmentCameraBinding.overlay.background = Color.argb(150, 255, 255, 255).toDrawable()
            // Wait for ANIMATION_FAST_MILLIS
            fragmentCameraBinding.overlay.postDelayed({
                // Remove white flash animation
                fragmentCameraBinding.overlay.background = null
            }, CameraActivity.ANIMATION_FAST_MILLIS)
        }
    }

    /** [HandlerThread] where all buffer reading operations run */
    private val imageReaderThread = HandlerThread("imageReaderThread").apply { start() }
    private lateinit var settingsMenu: PopupMenu

    /** [Handler] corresponding to [imageReaderThread] */
    private val imageReaderHandler = Handler(imageReaderThread.looper)

    /** The [CameraDevice] that will be opened in this fragment */
    private lateinit var camera: CameraDevice

    /** Internal reference to the ongoing [CameraCaptureSession] configured with our parameters */
    private lateinit var session: CameraCaptureSession

    /** Live data listener for changes in the device orientation relative to the camera */
    private lateinit var relativeOrientation: OrientationLiveData
//    data class Image(val imageUrl: String)

//    class MyAdapter(private val images: List<Int>) :
//        RecyclerView.Adapter<MyAdapter.MyViewHolder>() {
//
//        inner class MyViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
//            val imageView: ImageView = itemView.findViewById(R.id.image_view)
//        }
//
//        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MyViewHolder {
//            val itemView = LayoutInflater.from(parent.context)
//                .inflate(R.layout.item_cardview, parent, false)
//            return MyViewHolder(itemView)
//        }
//
//        override fun onBindViewHolder(holder: MyViewHolder, position: Int) {
//            holder.imageView.setImageResource(images[position])
//        }
//
//        override fun getItemCount() = images.size
//    }

    @RequiresApi(Build.VERSION_CODES.R)
    @SuppressLint("ResourceType", "MissingInflatedId")
    override fun onCreateView(
            inflater: LayoutInflater,
            container: ViewGroup?,
            savedInstanceState: Bundle?
    ): View {
        _fragmentCameraBinding = FragmentCameraBinding.inflate(inflater, container, false)

        val settings =  _fragmentCameraBinding!!.settings
        settings?.setOnClickListener {

            val popupView: View = inflater.inflate(R.layout.settings_window, null)
            val popupWindow = PopupWindow(
                popupView,
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )

            popupWindow.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT));
            popupWindow.isOutsideTouchable = true
            popupWindow.isFocusable = true;
            popupWindow.update();
            popupWindow.showAtLocation(_fragmentCameraBinding!!.root, Gravity.CENTER, 0, 0);


            val closeButton: Button = popupView.findViewById(R.id.closeSettings) as Button
            closeButton.setOnClickListener(
                View.OnClickListener {
                    popupWindow.dismiss()
                }
            )
            val captureNumber = popupView.findViewById(R.id.editTextNumber) as EditText
            fun modifyText(numberText: String) {
                captureNumber.setText(numberText)
                captureNumber.setSelection(numberText.length)
            }

            val captureMode: RadioGroup = popupView.findViewById(R.id.captureMode) as RadioGroup
            captureMode.setOnCheckedChangeListener { group, checkedId ->
                val radio: RadioButton = popupView.findViewById(checkedId)
                val id = resources.getResourceEntryName(checkedId)
                Log.d(TAG, radio.text as String)
                when (id) {
                    DURATION -> {
                        Log.d(TAG,DURATION)
                        selectedCapture = DURATION
                        captureNumber.visibility = View.VISIBLE
                        modifyText(durationTime.toString())

                    }
                    NUMBER_OF_PHOTOS -> {
                        Log.d(TAG,NUMBER_OF_PHOTOS)
                        selectedCapture = NUMBER_OF_PHOTOS
                        captureNumber.visibility = View.VISIBLE
                        modifyText(numberOfPhotos.toString())

                    }
                    UNTIL_STOPPED -> {
                        Log.d(TAG,UNTIL_STOPPED)
                        selectedCapture = UNTIL_STOPPED
                        captureNumber.visibility = View.GONE

                    }
                }
            }

            captureNumber.doAfterTextChanged {
                if (it.isNullOrBlank()) {
                    modifyText("0")
                    return@doAfterTextChanged
                }
                val originalText = it.toString()
                Log.d(TAG, "originalText $originalText")

                when (selectedCapture) {
                    DURATION -> {
                        durationTime = originalText.toInt()
                        Log.d(TAG, "durationTime $durationTime")

                    }
                    NUMBER_OF_PHOTOS -> {
                        numberOfPhotos = originalText.toInt()
                        Log.d(TAG, "numberOfPhotos $numberOfPhotos")
                    }
                }
            }// With the function

            when (selectedCapture) {
                DURATION -> {
                    // Set Radio
                    val selectedRadio: RadioButton = popupView.findViewById(R.id.duration)
                    selectedRadio.isChecked = true

                }
                NUMBER_OF_PHOTOS -> {
                    val selectedRadio: RadioButton = popupView.findViewById(R.id.number_of_photos)
                    selectedRadio.isChecked = true

                }
                UNTIL_STOPPED -> {
                    val selectedRadio: RadioButton = popupView.findViewById(R.id.until_stopped)
                    selectedRadio.isChecked = true
                }
            }

            val countdownSwitch: Switch = popupView.findViewById(R.id.mySwitch) as Switch
            countdownSwitch.isChecked = countDownTimer
            countdownSwitch.setOnCheckedChangeListener(CompoundButton.OnCheckedChangeListener {
                    _, isChecked ->
                countDownTimer = isChecked
            })
        }

        val alarm =  _fragmentCameraBinding!!.alarm
        alarm?.setOnClickListener {

            val popupView: View = inflater.inflate(R.layout.alarm_window, null)

            val popupWindow = PopupWindow(
                popupView,
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )

            popupWindow.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT));
            popupWindow.isOutsideTouchable = true
            popupWindow.showAtLocation(_fragmentCameraBinding!!.root, Gravity.CENTER, 0, 0);

            val closeButton: Button = popupView.findViewById(R.id.closeSettings) as Button
            closeButton.setOnClickListener {
                popupWindow.dismiss()
            }

            val alarmSwitch: Switch = popupView.findViewById(R.id.alarmFinished) as Switch
            alarmSwitch.isChecked = hasAlarm
            alarmSwitch.setOnCheckedChangeListener { _, isChecked ->
                hasAlarm = isChecked
            }

            val detectionSwitch: Switch = popupView.findViewById(R.id.alarmDetected) as Switch
            detectionSwitch.isChecked = hasDetectionAlarm
            detectionSwitch.setOnCheckedChangeListener { _, isChecked ->
                hasDetectionAlarm = isChecked
            }
        }


        val pictures =  _fragmentCameraBinding!!.savedPhotos
        pictures?.setOnClickListener {

            val popupView: View = inflater.inflate(R.layout.gallery_window, null)

            val popupWindow = PopupWindow(
                popupView,
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )

            popupWindow.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT));
            popupWindow.isOutsideTouchable = true
            popupWindow.showAtLocation(_fragmentCameraBinding!!.root, Gravity.CENTER, 0, 0);


            val directory = requireContext().filesDir
            val files: Array<File> = directory.listFiles()
            Log.d("Files", "Size: " + files.size)
            val bitmapArray: Array<Bitmap> = emptyArray()
            for (i in files.indices) {
                Log.d("Files", "FileName:" + files[i].name)
                bitmapArray.plus(decodeBitmapPreview("${directory.toPath()}/${files[i].name}"))
            }

            if(files.size > 0) {

                val test = CustomAdapter(bitmapArray)

                val recyclerView: RecyclerView = popupView.findViewById(R.id.galleryRec)
                val llm = LinearLayoutManager(requireContext())
                llm.orientation = LinearLayoutManager.VERTICAL
                recyclerView.layoutManager = llm
                recyclerView.adapter = test
            }

        }

        return fragmentCameraBinding.root
    }



    @SuppressLint("MissingPermission")
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val myWebView: WebView = fragmentCameraBinding.root.findViewById(R.id.webview1)
        myWebView.visibility = View.INVISIBLE

        fragmentCameraBinding.visitWebsite?.setOnClickListener {
            Log.d(TAG, "Loading website view ${isWebviewOpen}")
            if(isWebviewOpen) {
                myWebView.visibility = View.INVISIBLE
                isWebviewOpen = false

            } else {
                myWebView.visibility = View.VISIBLE
                myWebView.settings.javaScriptEnabled = true
                myWebView.loadUrl("https://d1e7enq0s1epae.cloudfront.net/")
                isWebviewOpen = true
            }
        }


        fragmentCameraBinding.viewFinder.holder.addCallback(object : SurfaceHolder.Callback {
            override fun surfaceDestroyed(holder: SurfaceHolder) = Unit

            override fun surfaceChanged(
                    holder: SurfaceHolder,
                    format: Int,
                    width: Int,
                    height: Int) = Unit

            override fun surfaceCreated(holder: SurfaceHolder) {
                // Selects appropriate preview size and configures view finder
                val previewSize = getPreviewOutputSize(
                    fragmentCameraBinding.viewFinder.display,
                    characteristics,
                    SurfaceHolder::class.java
                )
                Log.d(TAG, "View finder size: ${fragmentCameraBinding.viewFinder.width} x ${fragmentCameraBinding.viewFinder.height}")
                Log.d(TAG, "Selected preview size: $previewSize")
                fragmentCameraBinding.viewFinder.setAspectRatio(
                    previewSize.width,
                    previewSize.height
                )

                // To ensure that size is set, initialize camera in the view's thread
                view.post { initializeCamera() }
            }
        })

        // Used to rotate the output media to match device orientation
        relativeOrientation = OrientationLiveData(requireContext(), characteristics).apply {
            observe(viewLifecycleOwner, Observer { orientation ->
                Log.d(TAG, "Orientation changed: $orientation")
            })
        }
    }

    /**
     * Begin all camera operations in a coroutine in the main thread. This function:
     * - Opens the camera
     * - Configures the camera session
     * - Starts the preview by dispatching a repeating capture request
     * - Sets up the still image capture listeners
     */
    private fun initializeCamera() = lifecycleScope.launch(Dispatchers.Main) {
        // Open the selected camera
        camera = openCamera(cameraManager, args.cameraId, cameraHandler)

        // Initialize an image reader which will be used to capture still photos
        val size = characteristics.get(
                CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)!!
                .getOutputSizes(args.pixelFormat).maxByOrNull { it.height * it.width }!!
        imageReader = ImageReader.newInstance(
                size.width, size.height, args.pixelFormat, IMAGE_BUFFER_SIZE)

        // Creates list of Surfaces where the camera will output frames
        val targets = listOf(fragmentCameraBinding.viewFinder.holder.surface, imageReader.surface)

        // Start a capture session using our open camera and list of Surfaces where frames will go
        session = createCaptureSession(camera, targets, cameraHandler)

        val captureRequest = camera.createCaptureRequest(
                CameraDevice.TEMPLATE_PREVIEW).apply { addTarget(fragmentCameraBinding.viewFinder.holder.surface);
            set(CaptureRequest.JPEG_QUALITY, (90).toByte());
            set(CaptureRequest.LENS_FOCUS_DISTANCE, 0.0f);

        }

        // This will keep sending the capture request as frequently as possible until the
        // session is torn down or session.stopRepeating() is called
        session.setRepeatingRequest(captureRequest.build(), null, cameraHandler)


        // Listen to the capture button
        fragmentCameraBinding.captureButton.setOnClickListener {

//            // Disable click listener to prevent multiple requests simultaneously in flight
//            it.isEnabled = false

            // Set to recording state

            if(it.isSelected) {
                isStopping = true
                it.isSelected = false
            } else {
                it.isSelected = true

                // Perform I/O heavy operations in a different scope
                lifecycleScope.launch(Dispatchers.IO) {
                    takePhoto { result : Int ->
                        Log.d(TAG, "Stopping recording...")
                    }

                    // Re-enable click listener after photo is taken
                    it.post { it.isSelected = false }
            }


            }
        }
    }

    /** Opens the camera and returns the opened device (as the result of the suspend coroutine) */
    @SuppressLint("MissingPermission")
    private suspend fun openCamera(
            manager: CameraManager,
            cameraId: String,
            handler: Handler? = null
    ): CameraDevice = suspendCancellableCoroutine { cont ->
        manager.openCamera(cameraId, object : CameraDevice.StateCallback() {
            override fun onOpened(device: CameraDevice) {
                cont.resume(device)
            }

            override fun onDisconnected(device: CameraDevice) {
                Log.w(TAG, "Camera $cameraId has been disconnected")
                requireActivity().finish()
            }

            override fun onError(device: CameraDevice, error: Int) {
                val msg = when (error) {
                    ERROR_CAMERA_DEVICE -> "Fatal (device)"
                    ERROR_CAMERA_DISABLED -> "Device policy"
                    ERROR_CAMERA_IN_USE -> "Camera in use"
                    ERROR_CAMERA_SERVICE -> "Fatal (service)"
                    ERROR_MAX_CAMERAS_IN_USE -> "Maximum cameras in use"
                    else -> "Unknown"
                }
                val exc = RuntimeException("Camera $cameraId error: ($error) $msg")
                Log.e(TAG, exc.message, exc)
                if (cont.isActive) cont.resumeWithException(exc)
            }
        }, handler)
    }

    /**
     * Starts a [CameraCaptureSession] and returns the configured session (as the result of the
     * suspend coroutine
     */
    private suspend fun createCaptureSession(
            device: CameraDevice,
            targets: List<Surface>,
            handler: Handler? = null
    ): CameraCaptureSession = suspendCoroutine { cont ->

        // Create a capture session using the predefined targets; this also involves defining the
        // session state callback to be notified of when the session is ready
        device.createCaptureSession(targets, object : CameraCaptureSession.StateCallback() {

            override fun onConfigured(session: CameraCaptureSession) = cont.resume(session)

            override fun onConfigureFailed(session: CameraCaptureSession) {
                val exc = RuntimeException("Camera ${device.id} session configuration failed")
                Log.e(TAG, exc.message, exc)
                cont.resumeWithException(exc)
            }
        }, handler)
    }

    /**
     * Helper function used to capture a still image using the [CameraDevice.TEMPLATE_STILL_CAPTURE]
     * template. It performs synchronization between the [CaptureResult] and the [Image] resulting
     * from the single capture, and outputs a [CombinedCaptureResult] object.
     */
    private suspend fun takePhoto(param: (Any)):
            Int = suspendCoroutine { cont ->


        // Start a new image queue
        val imageQueue = ArrayBlockingQueue<Image>(IMAGE_BUFFER_SIZE)
        imageReader.setOnImageAvailableListener({ reader ->
            val image = reader.acquireNextImage()
            Log.d(TAG, "Image available in queue: ${image.timestamp}")
            imageQueue.add(image)
        }, imageReaderHandler)

        val sdf = SimpleDateFormat("dd:M:yyyy_hh:mm:ss")
        val startDate = sdf.format(Date())

        val captureRequest = session.device.createCaptureRequest(
                CameraDevice.TEMPLATE_MANUAL).apply {
                    addTarget(imageReader.surface);
            set(CaptureRequest.JPEG_QUALITY, (90).toByte());
//            set(CaptureRequest.CONTROL_AWB_MODE, CaptureRequest.CONTROL_AWB_MODE_AUTO);
            set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_OFF);
            set(CaptureRequest.SENSOR_EXPOSURE_TIME, 3000000000);
            set(CaptureRequest.LENS_FOCUS_DISTANCE, 0.0f);
            set(CaptureRequest.SENSOR_SENSITIVITY, 1600)
                }
        session.setRepeatingRequest(captureRequest.build(), object : CameraCaptureSession.CaptureCallback() {

            override fun onCaptureStarted(
                    session: CameraCaptureSession,
                    request: CaptureRequest,
                    timestamp: Long,
                    frameNumber: Long) {
                super.onCaptureStarted(session, request, timestamp, frameNumber)
                fragmentCameraBinding.viewFinder.post(animationTask)
            }

            @RequiresApi(Build.VERSION_CODES.Q)
            @SuppressLint("RequiresFeature")
            override fun onCaptureCompleted(
                    session: CameraCaptureSession,
                    request: CaptureRequest,
                    result: TotalCaptureResult) {
                super.onCaptureCompleted(session, request, result)
                val resultTimestamp = result.get(CaptureResult.SENSOR_TIMESTAMP)
                Log.d(TAG, "Capture result received: $resultTimestamp")

                val resString = result.get(CaptureResult.SENSOR_EXPOSURE_TIME)
                Log.d(TAG, "Capture result exposure: $resString")

                // Loop in the coroutine's context until an image with matching timestamp comes
                // We need to launch the coroutine context again because the callback is done in
                //  the handler provided to the `capture` method, not in our coroutine context
                @Suppress("BlockingMethodInNonBlockingContext")
                lifecycleScope.launch(cont.context) {
                    while (true) {
                        // Dequeue images while timestamps don't match
                        val image = imageQueue.take()
                        if (image != null) {
                            if(isStopping) {
                                session.stopRepeating()
                                camera.close()

                                Log.d(TAG, "Stop repeating")
                                cont.resume(0)
                            }
                            Log.d(TAG, "Image dequeued: ${image.timestamp}")
                            photosTaken++

                            // TODO(owahltinez): b/142011420

                            // Compute EXIF orientation metadata


                            val buffer = image.planes[0].buffer.slice()
                            val bytes = ByteArray(buffer.remaining()).apply { buffer.get(this) }
                            val bmpImage: Bitmap =
                                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                            Log.d(TAG, "${bmpImage.toString()}")
                            val width = bmpImage.width
                            val height = bmpImage.height
                            val downWidth = width / 3
                            val downHeight = height / 3
                            val smallBmp: Bitmap =
                                Bitmap.createScaledBitmap(bmpImage, downWidth, downHeight, false)
                            Log.d(TAG, "small bitmap ${smallBmp.toString()}")

                            var pixels = IntArray(downWidth * downHeight)
                            smallBmp.getPixels(pixels, 0, downWidth, 0, 0, downWidth, downHeight)

//                            var unpackedArray = IntArray(downWidth * downHeight * 4)
//                            for ((index, value) in pixels.withIndex()) {
//                                val k = index * 4
//                                unpackedArray[k] = Color.red(value)
//                                unpackedArray[k + 1] = Color.green(value)
//                                unpackedArray[k + 2] = Color.blue(value)
//                                unpackedArray[k + 3] = Color.alpha(value)
//                            }

                            var imgData = ImageData(pixels, downWidth, downHeight)

                            val center = (imgData.width / 2) * (imgData.height / 2)
                            fun brightness(pixel: Int) : Double {
                                return (Color.red(pixel) +
                                        Color.green(pixel) +
                                        Color.blue(pixel)) / 3.0
                            }
                            val listBright = listOf(
                                    brightness(pixels[center + 30]),
                                    brightness(pixels[center - 30]),
                                    brightness(pixels[center]),
                                    80.0)
                            val pixelScoreThreshold: Int = 5 + (listBright.minOrNull()?.toInt() ?: 10)
                            val rotation = relativeOrientation.value ?: 0
                            val mirrored = characteristics.get(CameraCharacteristics.LENS_FACING) ==
                                    CameraCharacteristics.LENS_FACING_FRONT
                            val exifOrientation = computeExifOrientation(rotation, mirrored)

                            Log.d(TAG, "lineAlgorithm: $pixelScoreThreshold")


                            val res = lineAlgorithm(imgData, pixelScoreThreshold)

                            val resObject = "{istart: ${res.istart}, iend: ${res.iend}, jstart: ${res.jstart}, jend: ${res.jend}, size: ${res.size}}"


                            val currentDate = sdf.format(Date())


                            Log.d(TAG, "resObject: $resObject")

//                            DEBUG
//                            val highlightBitmap = createHighlightBitmap(smallBmp, pixelScoreThreshold)
//                            writeBitmapToDisk(highlightBitmap, fileDir, "testPost.jpeg", exifOrientation, resObject)
//                            writeBitmapToDisk(smallBmp, fileDir, "original.jpeg", exifOrientation, resObject)
//                            val sq = drawSquareOnBitmap(smallBmp, res.jstart.toFloat(),
//                               res.istart.toFloat(), res.jend.toFloat(), res.iend.toFloat())
//                            writeBitmapToDisk(sq, fileDir, "selected.jpeg", exifOrientation, resObject)

                            image.close()
                            if (res.size >= 9) {
                                photosCaptured++

                                val fileDir = requireContext().filesDir

                                val output = writeBitmapToDisk(bmpImage, fileDir, "$currentDate.jpeg", exifOrientation, resObject)

                                val storageRef = Firebase.storage.reference;
                                val firebasePath = "${startDate}/${currentDate}.jpeg"
                                Log.e(TAG, firebasePath)

                                val uploadTask = storageRef.child(
                                        firebasePath
                                    ).putFile(output.toUri(), storageMetadata {
                                        contentType = "image/jpeg"
                                    })
                                    // Register observers to listen for when the download is done or if it fails
                                    uploadTask.addOnFailureListener { error ->
                                        // Handle unsuccessful uploads
                                        Log.e(TAG, error.toString())
                                        image.close()

                                    }.addOnSuccessListener { taskSnapshot ->
                                        Log.e(TAG, taskSnapshot.toString())
                                        image.close()
                                        // taskSnapshot.metadata contains file metadata such as size, content-type, etc.
                                        // ...
                                    }

                            } else {
                                image.close()
                            }


                            // Build the result and resume progress
                            // There is no need to break out of the loop, this coroutine will suspend

                        }
                    }
                }
            }
        }, cameraHandler)
    }

    override fun onStop() {
        super.onStop()
        try {
//            camera.close()
        } catch (exc: Throwable) {
            Log.e(TAG, "Error closing camera", exc)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraThread.quitSafely()
        imageReaderThread.quitSafely()
    }

    override fun onDestroyView() {
        _fragmentCameraBinding = null
        super.onDestroyView()
    }

    companion object {
        private val TAG = CameraFragment::class.java.simpleName
        private var isStopping = false
        private var isWebviewOpen = false

        /** Maximum number of images that will be held in the reader's buffer */
        private const val IMAGE_BUFFER_SIZE: Int = 3

        /** Maximum time allowed to wait for the result of an image capture */
        private const val IMAGE_CAPTURE_TIMEOUT_MILLIS: Long = 5000

        /** Helper data class used to hold capture metadata with their associated image */
        data class CombinedCaptureResult(
            val image: Image,
            val metadata: CaptureResult,
            val bytes: ByteArray,
            val orientation: Int,
            val format: Int
        ) : Closeable {
            override fun close() = image.close()
        }

        data class ImageData(
            var data: IntArray,
            var width: Int,
            var height: Int,
        ) {
            override fun equals(other: Any?): Boolean {
                if (this === other) return true
                if (javaClass != other?.javaClass) return false

                other as ImageData

                if (!data.contentEquals(other.data)) return false
                if (width != other.width) return false
                if (height != other.height) return false

                return true
            }

            override fun hashCode(): Int {
                var result = data.contentHashCode()
                result = 31 * result + width
                result = 31 * result + height
                return result
            }
        }
        fun createHighlightBitmap(smallBmp: Bitmap, brightness: Int): Bitmap {
            val smallBmpPost = Bitmap.createBitmap(smallBmp)
            val pixels2 = IntArray(smallBmpPost.height * smallBmpPost.width)
            smallBmpPost.getPixels(
                pixels2,
            0,
                smallBmpPost.width,
            0,
            0,
                smallBmpPost.width,
                smallBmpPost.height
            )
            for (i in 0 until smallBmpPost.width * smallBmpPost.height)  {
                val r = Color.red(pixels2[i])
                val g = Color.green(pixels2[i])
                val b = Color.blue(pixels2[i])


                val pixelScore = ((r + g + b) / 3)
                if(pixelScore >= brightness) {
                    pixels2[i] = Color.RED
                } else {
                    pixels2[i] = pixels2[i]
                }
            }
            smallBmpPost.setPixels(
                pixels2,
            0,
                smallBmpPost.width,
            0,
            0,
                smallBmpPost.width,
                smallBmpPost.height
            )
            return smallBmpPost
        }
        fun drawSquareOnBitmap(bitmap: Bitmap, left: Float, top: Float, right: Float, bottom: Float): Bitmap {
            val newBitmap = Bitmap.createBitmap(bitmap.width, bitmap.height, bitmap.config)
            val canvas = Canvas(newBitmap)
            val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = Color.GREEN
                this.style = Paint.Style.STROKE
                this.isDither = true
            }
            canvas.drawRect(left, top, right,bottom, paint)
            return newBitmap
        }

        // Compress the bitmap as JPEG with 90% quality
        @RequiresApi(Build.VERSION_CODES.Q)
        fun writeBitmapToDisk(bitmap: Bitmap, dir: File, fileName: String, exifOrientation: Int, resObject: String): File {
            val file = File(dir, fileName)

            val outputStream = FileOutputStream(file)

            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)

            outputStream.flush()
            outputStream.close()

            val exif = ExifInterface(file)
            exif.setAttribute(
                ExifInterface.TAG_ORIENTATION, exifOrientation.toString())
            exif.setAttribute(
                ExifInterface.TAG_USER_COMMENT, resObject)

            exif.saveAttributes()


            Log.d(TAG, "EXIF metadata saved")

            return file
      }

        data class BrightCluster(
            var istart: Int,
            var iend: Int,
            var jstart: Int,
            var jend: Int,
            var size: Int,
        )

        /** Utility function used to decode a [Bitmap] from a byte array */
        private fun decodeBitmapPreview(filepath: String): Bitmap {
            val inputFile = File(filepath)
            val inputBuffer = BufferedInputStream(inputFile.inputStream()).let { stream ->
                ByteArray(stream.available()).also {
                    stream.read(it)
                    stream.close()
                }
            }

            val exif = ExifInterface(filepath)

            val tagOrientation = exif.getAttribute( ExifInterface.TAG_ORIENTATION)
            val bright = exif.getAttribute( ExifInterface.TAG_USER_COMMENT)


            Log.d(TAG, "tagOrientation:  $tagOrientation")
            Log.d(TAG, "bright:  $bright")

            var topLeftX = 0
            var topLeftY = 0

            if(bright != null) {
                val jsonObject = JSONTokener(bright).nextValue() as JSONObject
                topLeftX = jsonObject.get("istart") as Int
                topLeftY = jsonObject.get("jstart") as Int
            }
            Log.d(TAG, "topLeft:  ${topLeftX.toString()} ${topLeftY.toString()}")



            var orientation = 0
            if(tagOrientation !=null) {
                orientation = parseInt(tagOrientation)
            }

            val bitmapTransformation = decodeExifOrientation(orientation)


            // Load bitmap from given buffer
            val bitmap = BitmapFactory.decodeByteArray(inputBuffer, 0, inputBuffer.size)

            // Transform bitmap orientation using provided metadata
            return Bitmap.createBitmap(
                bitmap, min(max(topLeftY * 3 - 100, 0), bitmap.height), min(max(topLeftX * 3 - 100,0), bitmap.width), 250, 250, bitmapTransformation, true)
        }

        private fun lineAlgorithm(imageData: ImageData, pixelScoreThreshold: Int): BrightCluster {
            Log.d(TAG, "Line algorithm starting...")
            Log.d(TAG, "Line algorithm continuing 1.1.. ${imageData.data.size}")
            Log.d(TAG, "Line algorithm continuing 1.1.. ${imageData.data.size}")

            Log.d(TAG, "pixelScoreThreshold $pixelScoreThreshold")

            val rows = imageData.height
            val cols = imageData.width

            val dp = Array(rows) { mutableMapOf<Int, BrightCluster>() }
            val objects = mutableMapOf<Int, BrightCluster>()
            var objectCount = 1
            var longestObject = BrightCluster(0, 0, 0, 0, 0)
            Log.d(TAG, "Line algorithm continuing 1.5...")

            fun getSize(obj: BrightCluster): Int {
                return (sqrt(
                    (((obj.istart - obj.iend) * (obj.istart - obj.iend) +
                            (obj.jstart - obj.jend) * (obj.jstart - obj.jend)).toDouble())
                )).toInt()
            }

            var count = 0
            var loops = 0

            Log.d(TAG, "Line algorithm continuing 2...")

            for (i in 0 until rows) {

                if (count > 5000) {
                    Log.d(TAG, "Line algorithm hit count 5000")
                    return longestObject
                }
                for (j in 0 until cols) {
                    loops++
                    if (count > 5000) {
                        Log.d(TAG, "Line algorithm hit count 5000")

                        return longestObject
                    }
                    val k = (i * cols + j)
                    val r = Color.red(imageData.data[k])
                    val g = Color.green(imageData.data[k])
                    val b = Color.blue(imageData.data[k])


                    val pixelScore = ((r + g + b) / 3)
                    if (pixelScore >= pixelScoreThreshold) {
                        count++
                        var left: BrightCluster? = null
                        var topLeft: BrightCluster? = null
                        var top: BrightCluster? = null
                        var topRight: BrightCluster? = null

                        if (j > 0 && dp[i][j - 1] != null) {
                            left = dp[i][j - 1] as BrightCluster
                            dp[i][j] = left

                            left.istart = min(i, left.istart)
                            left.iend = max(i, left.iend)
                            left.jstart = min(j, left.jstart)
                            left.jend = max(j, left.jend)
                            left.size = getSize(left)

                            if (left.size > longestObject.size) {
                                longestObject = left
                            }
                        }

                        if (i > 0 && j > 0 && dp[i - 1][j - 1] != null) {
                            topLeft = dp[i - 1][j - 1] as BrightCluster
                            dp[i][j] = topLeft

                            topLeft.istart = min(i, topLeft.istart)
                            topLeft.iend = max(i, topLeft.iend)
                            topLeft.jstart = min(j, topLeft.jstart)
                            topLeft.jend = max(j, topLeft.jend)
                            topLeft.size = getSize(topLeft)

                            if (topLeft.size > longestObject.size) {
                                longestObject = topLeft
                            }
                        }
                        if (i > 0 && dp[i - 1][j] != null) {
                            top = dp[i - 1][j] as BrightCluster
                            dp[i][j] = top

                            top.istart = min(i, top.istart)
                            top.iend = max(i, top.iend)
                            top.jstart = min(j, top.jstart)
                            top.jend = max(j, top.jend)

                            if (top.size > longestObject.size) {
                                longestObject = top
                            }
                        }

                        if (i > 0 && j < cols - 1 && dp[i - 1][j + 1] != null) {
                            topRight = dp[i - 1][j + 1] as BrightCluster
                            dp[i][j] = topRight
                            dp[i][j - 1] = topRight

                            topRight.istart = min(i, topRight.istart)
                            topRight.iend = max(i, topRight.iend)
                            topRight.jstart = min(j, topRight.jstart)
                            topRight.jend = max(j, topRight.jend)

                            if (topRight.size > longestObject.size) {
                                longestObject = topRight
                            }

                        }

                        if (left == null && top == null && topLeft == null && topRight == null) {
                            Log.d(TAG, "new Object")

                            val newObject = BrightCluster(i, i, j, j, 1)
                            dp[i][j] = newObject
                            objects[objectCount] = newObject
                            objectCount++
                        }
                    }
                }
            }
            Log.d(TAG, count.toString())
            Log.d(TAG, (imageData.width * imageData.height).toString())
            Log.d(TAG, loops.toString())

            Log.d(TAG, objects.size.toString())

            Log.d(TAG, longestObject.toString())

            return longestObject
        }
    }

    class CustomAdapter(private val dataSet: Array<Bitmap>) :
        RecyclerView.Adapter<CustomAdapter.ViewHolder>() {

        /**
         * Provide a reference to the type of views that you are using
         * (custom ViewHolder)
         */
        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val imageView: ImageView

            init {
                // Define click listener for the ViewHolder's View
                imageView = view.findViewById(R.id.galleryImageView)
            }
        }

        // Create new views (invoked by the layout manager)
        override fun onCreateViewHolder(viewGroup: ViewGroup, viewType: Int): ViewHolder {
            // Create a new view, which defines the UI of the list item
            val view = LayoutInflater.from(viewGroup.context)
                .inflate(R.layout.gallery_image, viewGroup, false)

            return ViewHolder(view)
        }

        // Replace the contents of a view (invoked by the layout manager)
        override fun onBindViewHolder(viewHolder: ViewHolder, position: Int) {

            // Get element from your dataset at this position and replace the
            // contents of the view with that element
            viewHolder.imageView.setImageBitmap(dataSet[position])
        }

        // Return the size of your dataset (invoked by the layout manager)
        override fun getItemCount() = dataSet.size

    }

}