package com.example.myapplication

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CaptureRequest
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.camera2.interop.Camera2CameraInfo
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import com.example.myapplication.databinding.ActivityMainBinding
import com.google.android.material.snackbar.Snackbar
import com.google.common.util.concurrent.ListenableFuture
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors


@androidx.camera.camera2.interop.ExperimentalCamera2Interop

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var cameraProviderFuture: ListenableFuture<ProcessCameraProvider>
    private lateinit var cameraSelector: CameraSelector
    private var imageCapture: ImageCapture? = null
    private var imageAnalysis: ImageAnalysis? = null

    private lateinit var imgCaptureExecutor: ExecutorService
    private val cameraProviderResult = registerForActivityResult(ActivityResultContracts.RequestPermission()){ permissionGranted->
        if(permissionGranted){
            startCamera()
        } else {
            Snackbar.make(binding.root,"The camera permission is required", Snackbar.LENGTH_INDEFINITE).show()
        }
    }

    companion object {
        val TAG = "MainActivity"
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        imgCaptureExecutor = Executors.newSingleThreadExecutor()
        cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
        cameraProviderResult.launch(android.Manifest.permission.CAMERA)
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)


        binding.imgCaptureBtn.setOnClickListener{
            takePhoto()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                animateFlash()
            }
        }
        binding.galleryBtn.setOnClickListener {
            val intent = Intent(this, GalleryActivity::class.java)
            startActivity(intent)
        }

    }
//    fun buildImageAnalysisUseCase(): ImageAnalysis {
//        return ImageAnalysis.Builder()
//            .setTargetAspectRatio(aspectRatio)
//            .setTargetRotation(rotation)
//            .setTargetResolution(resolution)
//            .setBackpressureStrategy(strategy)
//            .setImageQueueDepth(queueDepth)
//            .build()
//    }

    @SuppressLint("RestrictedApi")
    @androidx.camera.camera2.interop.ExperimentalCamera2Interop
    private fun startCamera(){
        // listening for data from the camera
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val imageAnalysisBuilder = ImageAnalysis.Builder()
            imageAnalysis = imageAnalysisBuilder.build()

            val imageCaptureBuilder = ImageCapture.Builder()
            Camera2Interop.Extender(imageCaptureBuilder)
                .setCaptureRequestOption(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_OFF)
                .setCaptureRequestOption(CaptureRequest.SENSOR_EXPOSURE_TIME, 3000000000)
            imageCapture = imageCaptureBuilder.build()
            // connecting a preview use case to the preview in the xml file.
            val preview = Preview.Builder().build().also{
                it.setSurfaceProvider(binding.preview.surfaceProvider)
            }
            try{
                // clear all the previous use cases first.
                cameraProvider.unbindAll()
                // binding the lifecycle of the camera to the lifecycle of the application.
                val camera = cameraProvider.bindToLifecycle(this,cameraSelector,preview, imageAnalysis)

                // Set to best settings for satellite capture
                val cameraControl = camera.cameraControl
                val cameraInfo = camera.cameraInfo
                val minZoom = cameraInfo.getZoomState().getValue()!!.getMinZoomRatio()
                val camChars = Camera2CameraInfo.extractCameraCharacteristics(cameraInfo)
                val sensorExposure = camChars
                    .get(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE)
                Log.d("sensor_exposure", sensorExposure.toString())
                val sensorISO = camChars
                    .get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE)
                Log.d("sensorISO", sensorISO.toString())
                cameraControl.setZoomRatio(minZoom)
            } catch (e: Exception) {
                Log.d(TAG, "Use case binding failed")
            }

        }, ContextCompat.getMainExecutor(this))
    }
    private fun takePhoto(){
        imageCapture?.let{
            //Create a storage location whose fileName is timestamped in milliseconds.
            val fileName = "JPEG_${System.currentTimeMillis()}"
            val file = File(externalMediaDirs[0],fileName)

            // Save the image in the above file
            val outputFileOptions = ImageCapture.OutputFileOptions.Builder(file).build()

            /* pass in the details of where and how the image is taken.(arguments 1 and 2 of takePicture)
            pass in the details of what to do after an image is taken.(argument 3 of takePicture) */

            it.takePicture(
                outputFileOptions,
                imgCaptureExecutor,
                object : ImageCapture.OnImageSavedCallback {
                    override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults){
                        Log.i(TAG,"The image has been saved in ${file.toUri()}")
                    }

                    override fun onError(exception: ImageCaptureException) {
                        Toast.makeText(
                            binding.root.context,
                            "Error taking photo",
                            Toast.LENGTH_LONG
                        ).show()
                        Log.d(TAG, "Error taking photo:$exception")
                    }

                },
//                object : ImageCapture.OnImageCapturedCallback() {
//                    override fun onCaptureSuccess(image: ImageProxy) {
//                        //get bitmap from image
////                        val bitmap = imageProxyToBitmap(image)
//                        Log.d("Image Proxy", "$image")
//                        super.onCaptureSuccess(image)
//                    }
//
//                    override fun onError(exception: ImageCaptureException) {
//                        super.onError(exception)
//                    }
//                },
                )
        }
    }
    @RequiresApi(Build.VERSION_CODES.M)
    private fun animateFlash() {
        binding.root.postDelayed({
            binding.root.foreground = ColorDrawable(Color.WHITE)
            binding.root.postDelayed({
                binding.root.foreground = null
            }, 50)
        }, 100)
    }


}