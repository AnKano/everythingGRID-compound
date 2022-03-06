package sh.anshu.testwasm;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Objects;

public class MainActivity extends AppCompatActivity {
    // Used to load the 'testwasm' library on application startup.
    static {
        System.loadLibrary("testwasm");
        System.loadLibrary("node");
    }

    private boolean nodeStarted = false;
    private Thread nodeThread;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        final Button startButton = findViewById(R.id.startBtn);
        final TextView serverStatus = findViewById(R.id.serverStatus);

        String nodeDir = getApplicationContext().getFilesDir().getAbsolutePath() + "/nodejs-project";

        startButton.setOnClickListener(view -> {
            if (!nodeStarted) {
                if (wasAPKUpdated()) {
                    File nodeDirReference = new File(nodeDir);
                    if (nodeDirReference.exists()) {
                        deleteFolderRecursively(new File(nodeDir));
                    }

                    copyAssetFolder(getApplicationContext().getAssets(), "nodejs-project", nodeDir);

                    saveLastUpdateTime();
                }

                Intent serviceIntent = new Intent(this, NodeBackgroundTask.class);
                serviceIntent.putExtra("inputExtra", "Foreground Service Example in Android");
                startForegroundService(serviceIntent);

                runOnUiThread(() -> {
                    serverStatus.setText("Server started on https://localhost:3000");
                    startButton.setBackgroundColor(ContextCompat.getColor(this, R.color.accept_button));
                });

                nodeStarted = true;
            }
        });
    }

    private boolean wasAPKUpdated() {
        SharedPreferences prefs = getApplicationContext().getSharedPreferences("NODEJS_MOBILE_PREFS", Context.MODE_PRIVATE);
        long previousLastUpdateTime = prefs.getLong("NODEJS_MOBILE_APK_LastUpdateTime", 0);
        long lastUpdateTime = 1;
        try {
            PackageInfo packageInfo = getApplicationContext().getPackageManager().getPackageInfo(getApplicationContext().getPackageName(), 0);
            lastUpdateTime = packageInfo.lastUpdateTime;
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
        return (lastUpdateTime != previousLastUpdateTime);
    }

    private void saveLastUpdateTime() {
        long lastUpdateTime = 1;
        try {
            PackageInfo packageInfo = getApplicationContext().getPackageManager().getPackageInfo(getApplicationContext().getPackageName(), 0);
            lastUpdateTime = packageInfo.lastUpdateTime;
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
        SharedPreferences prefs = getApplicationContext().getSharedPreferences("NODEJS_MOBILE_PREFS", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putLong("NODEJS_MOBILE_APK_LastUpdateTime", lastUpdateTime);
        editor.apply();
    }

    private static boolean deleteFolderRecursively(File file) {
        try {
            boolean res = true;
            for (File childFile : Objects.requireNonNull(file.listFiles())) {
                if (childFile.isDirectory()) {
                    res &= deleteFolderRecursively(childFile);
                } else {
                    res &= childFile.delete();
                }
            }
            res &= file.delete();
            return res;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private static boolean copyAssetFolder(AssetManager assetManager, String fromAssetPath, String toPath) {
        try {
            String[] files = assetManager.list(fromAssetPath);
            boolean res = true;

            if (files.length == 0) {
                //If it's a file, it won't have any assets "inside" it.
                res = copyAsset(assetManager,
                        fromAssetPath,
                        toPath);
            } else {
                new File(toPath).mkdirs();
                for (String file : files)
                    res &= copyAssetFolder(assetManager, fromAssetPath + "/" + file,
                            toPath + "/" + file);
            }
            return res;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private static boolean copyAsset(AssetManager assetManager, String fromAssetPath, String toPath) {
        InputStream in;
        OutputStream out;
        try {
            in = assetManager.open(fromAssetPath);
            new File(toPath).createNewFile();
            out = new FileOutputStream(toPath);
            copyFile(in, out);
            in.close();
            out.flush();
            out.close();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private static void copyFile(InputStream in, OutputStream out) throws IOException {
        byte[] buffer = new byte[1024];
        int read;
        while ((read = in.read(buffer)) != -1) {
            out.write(buffer, 0, read);
        }
    }

    /**
     * A native method that is implemented by the 'testwasm' native library,
     * which is packaged with this application.
     */
//    public native int startNodeWithArguments(String[] arguments);
}