#include "quartz_tokenizer.h"
#include <ctype.h>
size_t quartz_token_count(const char *s){size_t n=0;int in=0;if(!s)return 0;for(const unsigned char*p=(const unsigned char*)s;*p;++p){if(isalnum(*p)){if(!in)++n;in=1;}else in=0;}return n;}
