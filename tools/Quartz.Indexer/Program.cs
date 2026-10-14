using System.Net.Http.Json;
if(args.Length<3){Console.Error.WriteLine("Usage: Quartz.Indexer <api-base-url> <url> <title> [content]");return 2;}
var api=args[0].TrimEnd('/');var doc=new{url=args[1],title=args[2],content=args.Length>3?args[3]:""};using var client=new HttpClient();var response=await client.PostAsJsonAsync($"{api}/api/admin/index",doc);Console.WriteLine($"HTTP {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");return response.IsSuccessStatusCode?0:1;
