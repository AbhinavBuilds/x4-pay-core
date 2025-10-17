#include "X402BleUtils.h"
#include <cctype>

bool startsWithIgnoreCase(const String &s, const char *prefix)
{
    size_t n = strlen(prefix);
    if (s.length() < n)
        return false;
    
    for (size_t i = 0; i < n; ++i)
    {
        char a = tolower(s[i]);
        char b = tolower(prefix[i]);
        if (a != b)
            return false;
    }
    return true;
}
