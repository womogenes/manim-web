# Generate a topo sort of manim-web library files

import re
import os
from collections import defaultdict
import graphlib
from pprint import pprint

topo_sorter = graphlib.TopologicalSorter()
adj = {}

root_dir = r"C:\Users\willi\Documents\_\Coding\Work\manim-web\lib\\"
for dirpath, dirnames, filenames in os.walk(root_dir):
    for filename in filenames:
        file_id = dirpath.removeprefix(root_dir).replace('\\', '/') + "/" + filename

        with open(f"{dirpath}\\{filename}") as fin:
            file = fin.read()
            deps = re.findall(r"(?<!// import ')package:manim_web/(.+)';", file)
            topo_sorter.add(file_id, *deps)
            adj[file_id] = deps

order = list(topo_sorter.static_order())
with open("./topo_order.txt", "w") as fout:
    fout.write("\n".join(order))
