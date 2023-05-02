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

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraMetadata
import android.os.Bundle
import android.util.Log
import android.util.Range
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.Navigation
import com.example.android.camera2.basic.R

private const val PERMISSIONS_REQUEST_CODE = 10
private val PERMISSIONS_REQUIRED = arrayOf(Manifest.permission.CAMERA)

/**
 * This [Fragment] requests permissions and, once granted, it will navigate to the next fragment
 */
class PermissionsFragment : Fragment() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (hasPermissions(requireContext())) {
            // If permissions have already been granted, proceed
            navigateToCamera();
        } else {
            // Request camera-related permissions
            requestPermissions(PERMISSIONS_REQUIRED, PERMISSIONS_REQUEST_CODE)
        }
    }

    override fun onRequestPermissionsResult(
            requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSIONS_REQUEST_CODE) {
            if (grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Takes the user to the success fragment when permission is granted
                navigateToCamera();
            } else {
                Toast.makeText(context, "Permission request denied", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun navigateToCamera()
    {
        lifecycleScope.launchWhenStarted {
            val cameraManager =
                requireContext().getSystemService(Context.CAMERA_SERVICE) as CameraManager

            val cameraList = PermissionsFragment.enumerateCameras(cameraManager)
            Log.d("CameraList", cameraList.toString())

            // Select RAW if available, high exposure if available
            Navigation.findNavController(requireActivity(), R.id.fragment_container).navigate(
                    PermissionsFragmentDirections.actionPermissionsFragmentToCameraFragment(
                        "0",
                        ImageFormat.JPEG))
        }
    }

    companion object {
        /** Convenience method used to check if all permissions required by this app are granted */
        fun hasPermissions(context: Context) = PERMISSIONS_REQUIRED.all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }
        /** Helper class used as a data holder for each selectable camera format item */
        private data class FormatItem(val title: String, val cameraId: String, val format: Int, val controlAE: IntArray, val lowerExposure: Long, val upperExposure: Long, val lowerISO: Int, val upperISO: Int,  )

        /** Helper function used to convert a lens orientation enum into a human-readable string */
        private fun lensOrientationString(value: Int) = when(value) {
            CameraCharacteristics.LENS_FACING_BACK -> "Back"
            CameraCharacteristics.LENS_FACING_FRONT -> "Front"
            CameraCharacteristics.LENS_FACING_EXTERNAL -> "External"
            else -> "Unknown"
        }

        /** Helper function used to list all compatible cameras and supported pixel formats */
        @SuppressLint("InlinedApi")
        private fun enumerateCameras(cameraManager: CameraManager): List<FormatItem> {
            val availableCameras: MutableList<FormatItem> = mutableListOf()

            // Get list of all compatible cameras
            val cameraIds = cameraManager.cameraIdList.filter {
                val characteristics = cameraManager.getCameraCharacteristics(it)
                val capabilities = characteristics.get(
                    CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)
                capabilities?.contains(
                    CameraMetadata.REQUEST_AVAILABLE_CAPABILITIES_BACKWARD_COMPATIBLE) ?: false
            }


            // Iterate over the list of cameras and return all the compatible ones
            cameraIds.forEach { id ->
                val characteristics = cameraManager.getCameraCharacteristics(id)
                val orientation = lensOrientationString(
                    characteristics.get(CameraCharacteristics.LENS_FACING)!!)

                // Query the available capabilities and output formats
                val capabilities = characteristics.get(
                    CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)!!
                val outputFormats = characteristics.get(
                    CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)!!.outputFormats

                val controlAE: IntArray? =
                    characteristics.get(CameraCharacteristics.CONTROL_AE_AVAILABLE_MODES)
                if (null != controlAE) {
                    Log.d(
                        "control AE settings",
                        controlAE.toString(),

                        )
                }

                val exposureTimeRange: Range<Long>? =
                    characteristics.get(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE)
                if (null != exposureTimeRange) {
                    Log.d(
                        "exposure time range ",
                        exposureTimeRange.getLower().toString() + "  " + exposureTimeRange.getUpper().toString(),

                    )
                }
                val isoRange:
                        Range<Int>? =
                    characteristics.get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE)
                if (null != isoRange) {
                        Log.d(
                            "iso range ",
                            isoRange.getLower().toString() + "  " + isoRange.getUpper().toString(),
                            )
                }

                // All cameras *must* support JPEG output so we don't need to check characteristics
                if(controlAE != null && exposureTimeRange!= null && isoRange != null && isoRange != null) {
                    availableCameras.add(FormatItem(
                        "$orientation JPEG ($id)", id, ImageFormat.JPEG, controlAE, exposureTimeRange.getLower(), exposureTimeRange.getUpper(), isoRange.getLower(), isoRange.getUpper(),  ))

                    // Return cameras that support RAW capability
                    if (capabilities.contains(
                            CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_RAW) &&
                        outputFormats.contains(ImageFormat.RAW_SENSOR)) {
                        availableCameras.add(FormatItem(
                            "$orientation RAW ($id)", id, ImageFormat.RAW_SENSOR, controlAE, exposureTimeRange.getLower(), exposureTimeRange.getUpper(), isoRange.getLower(), isoRange.getUpper() ))
                    }
                }

            }

            return availableCameras
        }
    }
}
