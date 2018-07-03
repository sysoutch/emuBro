package ch.sysout.emubro.impl.filter;

import ch.sysout.emubro.api.filter.Criteria;
import ch.sysout.emubro.api.filter.Filter;

public class NullFilter implements Filter<Object> {

	@Override
	public boolean match(Criteria criteria, Object t) {
		return true;
	}
}