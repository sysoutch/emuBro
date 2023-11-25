package ch.sysout.emubro.util;

import javax.swing.filechooser.FileSystemView;
import java.io.File;

public class EmuBroUtil {
    public static String getResourceDirectory() {
        return FileSystemView.getFileSystemView().getDefaultDirectory().getPath() + File.separator + "emuBro";
    }
}
