---
title: Seams
---
A "seam" is a boundary between objects, where one object interacts with
another. Seams help us think about how to separate the concerns between
different parts of an application. Just as individual pieces join along seams
to form complex objects in the real world, so do the objects that will
comprise our application. 

Seams allow us to view objects as collaborating with one another, rather than
having behavior from one object melded into another. The interaction between
components remains explicit; developers need not study object hierarchies to
understand an object's actual behavior.

## Real-world analogue

One of the most common and familar real-world seams is the standard electrical
outlet. Devices that plug into an outlet do not need to have their own
built-in power sources, nor are they wired directly into the source. They rely
on the contract implied by the outlet to provide the needed power, and are
portable to any location providing a compatible outlet.

By the same token, power sources providing an outlet can service any device
that matches the outlet. The power source can be a regional power grid, a
portable generator, or a battery pack.
