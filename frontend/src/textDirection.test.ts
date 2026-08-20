import {
    describe,
    expect,
    it,
} from 'vitest'

import {getTextDirection} from './textDirection'

describe('getTextDirection', () => {
    it('detects Farsi text with embedded LTR terms as RTL', () => {
        expect(
            getTextDirection(
                'کنترل سرعت موتور DC با کنترل‌کننده PID',
            ),
        ).toBe('rtl')
    })

    it('detects English text as LTR', () => {
        expect(
            getTextDirection('PID tuning from step-test data'),
        ).toBe('ltr')
    })

    it('ignores leading HTML markup when detecting direction', () => {
        expect(
            getTextDirection(
                '<h2>تنظیم کنترل‌کننده</h2><p>متن آموزشی</p>',
            ),
        ).toBe('rtl')
    })

    it('uses automatic direction for content without letters', () => {
        expect(getTextDirection('123 — 456')).toBe('auto')
    })
})
