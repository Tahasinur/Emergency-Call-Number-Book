1.What is the difference between getElementById, getElementsByClassName, and querySelector / querySelectorAll?<br>

Ans: getElementById selects one element by id, getElementsByClassName selects all elements under a class,
querySelector selects first element matching any css selector in the code,querySelectorAll selects all elements matching in css selector.

2.How do you create and insert a new element into the DOM?<br>
Ans: firstly i create a variable and using create element, i create a  empty div as a example, then i add text in the new box then
using appendChild i push it into the main section of the code.

let box=document.createElement("div");<br>
box.innerText ="Hello";<br>
document.body.appendChild(box);<br>

3.What is Event Bubbling and how does it work?<br>
Ans: Event Bubbling is a procces or technique when a event starts on a child element and automatically move up to it's parent elements.

4.What is Event Delegation in JavaScript? Why is it useful?<br>
Ans: Event Delegation is a technique where a parent element handles events for its child elements. 
It’s useful for dynamic elements and reduces multiple event .it's reduce the code complexty and reduce the time of loading

5.What is the difference between preventDefault() and stopPropagation() methods?<br>
Ans: preventdefault stops the browsers default actions, on the other hand stoppropagation prevents the event from bubbling up to parent elements.