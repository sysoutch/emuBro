package ch.sysout.emubro.controller;
import static java.nio.file.FileVisitResult.CONTINUE;

import java.io.File;
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

import ch.sysout.emubro.api.model.Explorer;
import ch.sysout.util.ValidationUtil;

class Finder extends SimpleFileVisitor<Path> {
	private final PathMatcher matcher;
	private int numMatches = 0;
	private Explorer explorer;
	private BrowseComputerWorker browseComputerWorker;
	private DirectorySearchedListener directorySearchedListener;
	private List<BrowseComputerListener> browseComputerListeners = new ArrayList<>();

	Finder(Explorer explorer, BrowseComputerWorker browseComputerWorker) {
		this.explorer = explorer;
		this.browseComputerWorker = browseComputerWorker;
		FileSystem fs = FileSystems.getDefault();
		matcher = fs.getPathMatcher("regex:"+explorer.getExtensionsRegexString());
	}

	void find(Path file, boolean directory) {
		if (directory) {
			// this runnable has been uncommented because gui would not response then.
			//			SwingUtilities.invokeLater(new Runnable() {
			//
			//				@Override
			//				public void run() {
			fireDirectorySearched(file);
			//				}
			//			});
		} else {
			Path name = file.getFileName();
			if (name != null && matcher.matches(name)) {
				numMatches++;
				System.out.println("file found: " + file);
				fireSearchForPlatformEvent(file.toFile());
			}
		}
	}

	private void fireDirectorySearched(Path file) {
		directorySearchedListener.directorySearched(file);
	}

	private void fireSearchForPlatformEvent(File file) {
		for (BrowseComputerListener l : browseComputerListeners) {
			l.searchForPlatform(file);
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
		System.out.println("Matched: " + numMatches);
	}

	// Invoke the pattern matching
	// method on each file.
	@Override
	public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
		if (browseComputerWorker.isDone()) {
			return FileVisitResult.TERMINATE;
		}
		find(file, false);
		return CONTINUE;
	}

	// Invoke the pattern matching
	// method on each directory.
	@Override
	public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
		DirectoryStream.Filter<Path> filter = new DirectoryStream.Filter<Path>() {
			@Override
			public boolean accept(Path entry) throws IOException {
				if (browseComputerWorker.isDone()
						|| explorer.isExcludedFileOrDirectory(entry.toFile())) {
					return false;
				}
				if (ValidationUtil.isWindows()) {
					DosFileAttributes attr;
					try {
						attr = Files.readAttributes(entry, DosFileAttributes.class);
						if (attr.isSystem()) {
							System.err.println("attention system file: " + entry);
							return false;
						} else if (attr.isHidden()) {
							System.err.println("attention hidden file: " + entry);
							return false;
						} else if (attr.isSymbolicLink()) {
							System.err.println("attention symbolic link: " + entry);
							return false;
						} else {
							return true;
						}
					} catch (IOException e) {
						System.err.println("ioexception while reading attributes of file " + entry
								+ ": " + "" + e.getMessage());
						return false;
					}
				} else {
					return true;
				}
			}
		};
		try (DirectoryStream<Path> stream = Files.newDirectoryStream(
				dir, filter)) {
			for (Path path : stream) {
				if (browseComputerWorker.isDone()) {
					return FileVisitResult.TERMINATE;
				}
				find(path, true);
			}
		} catch (IOException ex) {
			ex.printStackTrace();
		}
		return CONTINUE;
	}

	@Override
	public FileVisitResult visitFileFailed(Path file, IOException exc) {
		//            System.err.println(exc);
		return CONTINUE;
	}
}
