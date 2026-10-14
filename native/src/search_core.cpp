#include "quartz_search.hpp"
#include <algorithm>
#include <cctype>
#include <sstream>
#include <vector>
namespace{std::vector<std::string>w(std::string s){for(char&c:s)c=char(std::tolower((unsigned char)c));std::istringstream in(s);std::vector<std::string>v;std::string x;while(in>>x){x.erase(std::remove_if(x.begin(),x.end(),[](unsigned char c){return !std::isalnum(c);}),x.end());if(!x.empty())v.push_back(x);}return v;}}
namespace quartz{double score(const std::string&q,const Document&d){auto a=w(q),t=w(d.title),b=w(d.body);double s=0;for(const auto&x:a){if(std::find(t.begin(),t.end(),x)!=t.end())s+=5;s+=std::min<size_t>(3,std::count(b.begin(),b.end(),x));}return s;}}
