#include "quartz_search.hpp"
#include "quartz_tokenizer.h"
#include <cassert>
int main(){assert(quartz_token_count("Quartz search engine")==3);assert(quartz::score("quartz",{"Quartz",""})>quartz::score("quartz",{"Guide","quartz quartz quartz quartz"}));assert(quartz::score("missing",{"Quartz","search"})==0);}
