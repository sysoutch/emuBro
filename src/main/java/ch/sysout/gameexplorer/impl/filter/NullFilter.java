package ch.sysout.gameexplorer.impl.filter;

import ch.sysout.gameexplorer.api.filter.Criteria;
import ch.sysout.gameexplorer.api.filter.Filter;

public class NullFilter implements Filter<Object> {

	@Override
	public boolean match(Criteria criteria, Object t) {
		return true;
	}
}
