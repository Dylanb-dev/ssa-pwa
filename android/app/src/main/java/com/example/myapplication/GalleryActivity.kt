package com.example.myapplication

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import com.example.myapplication.databinding.ActivityGalleryBinding
import java.io.File

class GalleryActivity : AppCompatActivity() {
    private lateinit var binding: ActivityGalleryBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityGalleryBinding.inflate(layoutInflater)
        val directory = File(externalMediaDirs[0].absolutePath)
        val files = directory.listFiles() as Array<File>
        val adapter = GalleryAdapter(files.reversedArray())

        binding.viewPager.adapter = adapter
        setContentView(binding.root)
    }
}