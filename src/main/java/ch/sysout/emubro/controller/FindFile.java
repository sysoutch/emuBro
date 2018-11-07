package ch.sysout.emubro.controller;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.attribute.DosFileAttributes;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicLong;

import ch.sysout.util.ValidationUtil;

public class FindFile {
	public BroController controller;

	private class RunnableDirSearch implements Runnable {
		private final BlockingQueue<File>   dirQueue;
		private final BlockingQueue<File>   fileQueue;
		private final AtomicLong            count;
		private final int                   num;

		public RunnableDirSearch(final BlockingQueue<File> dirQueue, final BlockingQueue<File> fileQueue, final AtomicLong count, final int num) {
			this.dirQueue = dirQueue;
			this.fileQueue = fileQueue;
			this.count = count;
			this.num = num;
		}

		@Override
		public void run() {
			try {
				File dir = dirQueue.take();
				while (dir != null) {
					System.err.println("while dir: "+dir.getAbsolutePath());
					final File[] fi = dir.listFiles();
					if (fi != null) {
						for (final File file : fi) {
							if (file.isDirectory()) {
								if (controller.workerBrowseComputer.isDone()) {
									break;
								}
								if (controller.explorer.isExcludedFileOrDirectory(file)) {
									continue;
								}
								boolean acceptFile = false;
								if (ValidationUtil.isWindows()) {
									boolean isRoot = file.getAbsolutePath().equals(baseDir.getAbsolutePath());
									if (!isRoot) {
										DosFileAttributes attr = null;
										try {
											attr = Files.readAttributes(Paths.get(file.getAbsolutePath()), DosFileAttributes.class);
										} catch (IOException e) {
											System.err.println("ioexception while reading attributes of file " + file.getAbsolutePath()
											+ ": " + "" + e.getMessage());
											acceptFile = false;
										}
										if (attr.isSystem()) {
											System.err.println("attention system file: " + file.getAbsolutePath());
											acceptFile = false;
										} else if (attr.isHidden()) {
											System.err.println("attention hidden file: " + file.getAbsolutePath());
											acceptFile = false;
										} else if (attr.isSymbolicLink()) {
											System.err.println("attention symbolic link: " + file.getAbsolutePath());
											acceptFile = false;
										} else {
											//											SwingUtilities.invokeLater(new Runnable() {
											//
											//												@Override
											//												public void run() {
											//											controller.view.directorySearched(file.getAbsolutePath());
											//												}
											//											});
											acceptFile = true;
										}
									} else {
										acceptFile = true;
									}
								} else {
									acceptFile = true;
								}
								if (acceptFile) {
									count.incrementAndGet();
									dirQueue.put(file);
								}
							} else {
								fileQueue.put(file);
							}
						}
					}
					final long c = count.decrementAndGet();
					if (c == 0) {
						//						end();
					}
					dir = dirQueue.take();
					System.err.println("eeeeeeeeeeeeeeend");
				}
			} catch (final InterruptedException ie) {
				// file found or error
			}
		}
	}

	private static class CallableFileSearch implements Callable<File> {
		private final BlockingQueue<File>   dirQueue;
		private final BlockingQueue<File>   fileQueue;
		private final String                name;
		private final int                   num;

		public CallableFileSearch(final BlockingQueue<File> dirQueue, final BlockingQueue<File> fileQueue, final String name, final int num) {
			this.dirQueue = dirQueue;
			this.fileQueue = fileQueue;
			this.name = name;
			this.num = num;
		}

		@Override
		public File call() throws Exception {
			File file = fileQueue.take();
			while (file != null) {
				System.err.println(file.getAbsolutePath());
				final String filename = file.getName();
				if (filename.toLowerCase().matches(name.toLowerCase())) {
					//					end();
					//					return file;
					System.err.println(file.getAbsolutePath());
				}
				file = fileQueue.take();
			}
			System.err.println("eeeeeeeeeeeeeeend");
			return null;
		}
	}

	private final String        filename;
	private final File          baseDir;
	private final int           concurrency;
	private final AtomicLong    count;

	public FindFile(final String filename, final File baseDir, final int concurrency) {
		this.filename = filename;
		this.baseDir = baseDir;
		this.concurrency = concurrency;
		count = new AtomicLong(0);
	}

	public void find() {
		final ExecutorService ex = Executors.newFixedThreadPool(concurrency + 1);
		final BlockingQueue<File> dirQueue = new LinkedBlockingQueue<File>();
		final BlockingQueue<File> fileQueue = new LinkedBlockingQueue<File>(10000);
		for (int i = 0; i < concurrency; i++) {
			ex.submit(new RunnableDirSearch(dirQueue, fileQueue, count, concurrency));
		}
		count.incrementAndGet();
		dirQueue.add(baseDir);
		final Future<File> c = ex.submit(new CallableFileSearch(dirQueue, fileQueue, filename, concurrency));
		try {
			final File f = c.get();
			//			return f;
		} catch (final Exception e) {
			//			return null;
		} finally {
			ex.shutdownNow();
		}
	}

	public void findFile(BroController controller) {
		this.controller = controller;
		final long ini = System.currentTimeMillis();
		find();
		final long end = System.currentTimeMillis();
		System.out.println((end - ini) + " ms");
	}
}