package ch.sysout.emubro.controller;

import static java.nio.file.FileVisitResult.CONTINUE;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.PathMatcher;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.DosFileAttributes;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.util.ValidationUtil;

class Finder extends SimpleFileVisitor<Path> {
	private final PathMatcher matcher;
	private Explorer explorer;
	private BrowseComputerWorker browseComputerWorker;
	private DirectorySearchedListener directorySearchedListener;
	private List<BrowseComputerListener> browseComputerListeners = new ArrayList<>();
	private Iterable<Path> roots = FileSystems.getDefault().getRootDirectories();

	Finder(Explorer explorer, BrowseComputerWorker browseComputerWorker) {
		this.explorer = explorer;
		this.browseComputerWorker = browseComputerWorker;
		FileSystem fs = FileSystems.getDefault();
		matcher = fs.getPathMatcher("regex:" + explorer.getExtensionsRegexString());
	}

	void find(Path file) {
		Path name = file.getFileName();
		if (name != null && matcher.matches(name)) {
			fireSearchForPlatformEvent(file);
		}
	}

	private void fireDirectorySearched(Path file) {
		directorySearchedListener.directorySearched(file);
	}

	private void fireSearchForPlatformEvent(Path entry) {
		for (BrowseComputerListener l : browseComputerListeners) {
			l.searchForPlatform(entry);
		}
	}

	public void addDirectorySearchedListener(DirectorySearchedListener l) {
		directorySearchedListener = l;
	}

	public void addBrowseComputerListener(List<BrowseComputerListener> browseComputerListeners) {
		this.browseComputerListeners = browseComputerListeners;
	}

	// Prints the total number of
	// matches to standard out.
	void done() {
	}

	// Invoke the pattern matching
	// method on each file.
	@Override
	public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
		if (browseComputerWorker.isDone()) {
			return FileVisitResult.TERMINATE;
		}
		DosFileAttributes attr = null;
		try {
			attr = Files.readAttributes(file, DosFileAttributes.class);
		} catch (IOException e) {
			System.err.println(e.getMessage());
		}
		if (attr == null) {
			return CONTINUE;
		}
		if (attr.isSystem()) {
			return CONTINUE;
		}
		if (attr.isHidden()) {
			return CONTINUE;
		}
		if (attr.size() == 0) {
			return CONTINUE;
		}
		find(file);
		return FileVisitResult.CONTINUE;
	}

	// Invoke the pattern matching
	// method on each directory.
	@Override
	public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
		if (isRoot(dir)) {
			System.err.println("root: "+dir);
		} else {
			DosFileAttributes attr = null;
			try {
				attr = Files.readAttributes(dir, DosFileAttributes.class);
			} catch (IOException e) {
				System.err.println(e.getMessage());
			}
			if (attr == null) {
				System.err.println("attr null: " + dir.toString());
				return FileVisitResult.CONTINUE;
			}
			if (attr.isSystem()) {
				System.err.println("system: " + dir.toString());
				return FileVisitResult.SKIP_SUBTREE;
			}
			if (attr.isHidden()) {
				System.err.println("hidden: " + dir.toString());
				return FileVisitResult.SKIP_SUBTREE;
			}

			Map<String, String> map = System.getenv();
			String windir = map.get("windir");
			String windirOld = windir + ".old";

			String tmp = map.get("TMP");
			String temp = map.get("TEMP");

			Path filename = dir.getFileName();
			boolean hidden = filename != null && filename.toString().startsWith(".");
			if (dir.toAbsolutePath().toString().toLowerCase().startsWith(windir.toLowerCase())
					|| dir.toAbsolutePath().toString().toLowerCase().startsWith(windirOld.toLowerCase())
					|| dir.toAbsolutePath().toString().toLowerCase().matches(".:\\\\windows")
					|| dir.toAbsolutePath().toString().toLowerCase().startsWith(tmp.toLowerCase())
					|| dir.toAbsolutePath().toString().toLowerCase().startsWith(temp.toLowerCase())
					|| hidden) {
				return FileVisitResult.SKIP_SUBTREE;
			}
			return FileVisitResult.CONTINUE;
		}
		DirectoryStream.Filter<Path> filter = new DirectoryStream.Filter<Path>() {
			@Override
			public boolean accept(Path entry) throws IOException {
				if (browseComputerWorker.isDone() || explorer.isExcludedFileOrDirectory(entry)) {
					return false;
				}
				if (ValidationUtil.isWindows()) {
					DosFileAttributes attr;
					try {
						attr = Files.readAttributes(entry, DosFileAttributes.class);
						if (attr.isSystem()) {
							return false;
						} else if (attr.isHidden()) {
							return false;
						} else if (attr.isSymbolicLink()) {
							return false;
						} else {
							return true;
						}
					} catch (IOException e) {
						System.err.println(
								"ioexception while reading attributes of file " + entry + ": " + "" + e.getMessage());
						return false;
					}
				} else {
					return true;
				}
			}
		};
		try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir, filter)) {
			//			for (Path path : stream) {
			//				if (browseComputerWorker.isDone()) {
			//					return FileVisitResult.TERMINATE;
			//				}
			//			}
			stream.close();
		} catch (IOException ex) {
			ex.printStackTrace();
		}
		return CONTINUE;
	}

	@Override
	public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
		fireDirectorySearched(dir);
		return FileVisitResult.CONTINUE;
	}

	private boolean isRoot(Path dir) {
		for (Path name : roots) {
			boolean root = name.equals(dir);
			if (root) {
				return true;
			}
		}
		return false;
	}

	@Override
	public FileVisitResult visitFileFailed(Path file, IOException exc) {
		// System.err.println(exc);
		return CONTINUE;
	}
}
