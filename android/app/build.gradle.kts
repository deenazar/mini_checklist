plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.azarudeen.mimichecklist"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.azarudeen.mimichecklist"
        minSdk = 26
        targetSdk = 35
        versionCode = 17
        versionName = "4.4"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // For a quick test build the debug key is used; set up your own signing key before publishing.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    // The checklist screens are the same web app as the iPhone app: copied from ../../web at build time.
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/webassets"))
}

val syncWeb by tasks.registering(Sync::class) {
    from(rootProject.file("../web"))
    into(layout.buildDirectory.dir("generated/webassets/web"))
}
tasks.named("preBuild") { dependsOn(syncWeb) }

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
}
