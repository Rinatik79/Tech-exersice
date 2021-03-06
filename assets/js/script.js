//var onePhoneViuwer = true;

$(function () {

	// Globals variables

		// 	An array containing objects with information about the products.
	var products = [],

		// Our filters object will contain an array of values for each filter

		// Example:
		// filters = {
		// 		"manufacturer" = ["Apple","Sony"],
		//		"storage" = [16]
		//	}
		filters = {};


	//	Event handlers for frontend navigation

	//	Checkbox filtering

	var checkboxes = $('.all-products input[type=checkbox]');

	checkboxes.click(function () {

		var that = $(this),
			specName = that.attr('name');

		// When a checkbox is checked we need to write that in the filters object;
		if(that.is(":checked")) {

			// If the filter for this specification isn't created yet - do it.
			if(!(filters[specName] && filters[specName].length)){
				filters[specName] = [];
			}

			//	Push values into the chosen filter array
			filters[specName].push(that.val());

			// Change the url hash;
			createQueryHash(filters);

		}

		// When a checkbox is unchecked we need to remove its value from the filters object.
		if(!that.is(":checked")) {

			if(filters[specName] && filters[specName].length && (filters[specName].indexOf(that.val()) != -1)){

				// Find the checkbox value in the corresponding array inside the filters object.
				var index = filters[specName].indexOf(that.val());

				// Remove it.
				filters[specName].splice(index, 1);

				// If it was the last remaining value for this specification,
				// delete the whole array.
				if(!filters[specName].length){
					delete filters[specName];
				}

			}

			// Change the url hash;
			createQueryHash(filters);
		}
	});

	// When the "Clear all filters" button is pressed change the hash to '#' (go to the home page)
	$('.filters button').click(function (e) {
		e.preventDefault();
		window.location.hash = '#';
	});


	// Single product page buttons



	var singleProductPage = $('.single-product');

	singleProductPage.on('click', function (e) {

		if (singleProductPage.hasClass('visible')) {

				var clicked = $(e.target);

				// If the close button or the background are clicked go to the previous page.
				if (clicked.hasClass('close') || clicked.hasClass('overlay')) {
					// Change the url hash with the last used filters.
					createQueryHash(filters);
				}

		}
		

	});


	// These are called on page load

	// Get data about our products from products.json.
	$.getJSON( "products.json", function( data ) {

		// Write the data into our global variable.
		products = data;

		// Call a function to create HTML for all the products.
		generateAllProductsHTML(products);

		// Manually trigger a hashchange to start the app.
		$(window).trigger('hashchange');
	});


	// An event handler with calls the render function on every hashchange.
	// The render function will show the appropriate content of out page.
	$(window).on('hashchange', function(){
		render(decodeURI(window.location.hash));
	});


	// Navigation

	function render(url) {

		// Get the keyword from the url.
		var temp = url.split('/')[0];

		// Hide whatever page is currently shown.
		$('.main-content .page').removeClass('visible');


		var	map = {

			// The "Homepage".
			'': function() {

				// Clear the filters object, uncheck all checkboxes, show all the products
				filters = {};
				checkboxes.prop('checked',false);

				renderProductsPage(products);
			},

			// Single Products page.
			'#product': function() {

				// Get the index of which product we want to show and call the appropriate function.
				var index = url.split('#product/')[1].trim();

				renderSingleProductPage(index, products);
			},

			// Page with filtered products
			'#filter': function() {

				// Grab the string after the '#filter/' keyword. Call the filtering function.
				url = url.split('#filter/')[1].trim();

				// Try and parse the filters object from the query string.
				try {
					filters = JSON.parse(url);
				}
					// If it isn't a valid json, go back to homepage ( the rest of the code won't be executed ).
				catch(err) {
					window.location.hash = '#';
					return;
				}

				renderFilterResults(filters, products);
			}

		};

		// Execute the needed function depending on the url keyword (stored in temp).
		if(map[temp]){
			map[temp]();
		}
		// If the keyword isn't listed in the above - render the error page.
		else {
			renderErrorPage();
		}

	}


	// This function is called only once - on page load.
	// It fills up the products list via a handlebars template.
	// It recieves one parameter - the data we took from products.json.
	function generateAllProductsHTML(data){

		var list = $('.all-products .products-list');

		var theTemplateScript = $("#products-template").html();
		//Compile the template
		var theTemplate = Handlebars.compile (theTemplateScript);
		list.append (theTemplate(data));


		// Each products has a data-index attribute.
		// On click change the url hash to open up a preview for this product only.
		// Remember: every hashchange triggers the render function.

		list.find('li').on('click', function (e) {
			e.preventDefault();

			var productIndex = $(this).data('index');

			window.location.hash = 'product/' + productIndex;
		});

		list.find('button').on('click', function (e) {
			e.stopPropagation(); //stops style inhereting for button			
		})
	}

	// This function receives an object containing all the product we want to show.
	function renderProductsPage(data){

		var page = $('.all-products'),
			allProducts = $('.all-products .products-list > li');

		// Hide all the products in the products list.
		allProducts.addClass('hidden');

		// Iterate over all of the products.
		// If their ID is somewhere in the data object remove the hidden class to reveal them.
		allProducts.each(function () {

			var that = $(this);

			data.forEach(function (item) {
				if(that.data('index') == item.id){
					that.removeClass('hidden');
				}
			});
		});

		// Show the page itself.
		// (the render function hides all pages so we need to show the one we want).
		page.addClass('visible');

	}


	// Opens up a preview for one of the products.
	// Its parameters are an index from the hash and the products object.
	function renderSingleProductPage(index, data){

		var page = $('.single-product'),
			container = $('.preview-large');

		// Find the wanted product by iterating the data object and searching for the chosen index.
		if(data.length){
			data.forEach(function (item) {
				if(item.id == index){
					// Populate '.preview-large' with the chosen product's data.
					container.find('h3').text(item.name);
					container.find('img').attr('src', item.image.large);
					container.find('p').text(item.description);
				}
			});
		}

		// Show the page.
		page.addClass('visible');

	}

	// Find and render the filtered data results. Arguments are:
	// filters - our global variable - the object with arrays about what we are searching for.
	// products - an object with the full products list (from product.json).
	function renderFilterResults(filters, products){

			// This array contains all the possible filter criteria.
		var criteria = ['manufacturer','storage','os','camera'],
			results = [],
			isFiltered = false;

		// Uncheck all the checkboxes.
		// We will be checking them again one by one.
		checkboxes.prop('checked', false);


		criteria.forEach(function (c) {

			// Check if each of the possible filter criteria is actually in the filters object.
			if(filters[c] && filters[c].length){


				// After we've filtered the products once, we want to keep filtering them.
				// That's why we make the object we search in (products) to equal the one with the results.
				// Then the results array is cleared, so it can be filled with the newly filtered data.
				if(isFiltered){
					products = results;
					results = [];
				}


				// In these nested 'for loops' we will iterate over the filters and the products
				// and check if they contain the same values (the ones we are filtering by).

				// Iterate over the entries inside filters.criteria (remember each criteria contains an array).
				filters[c].forEach(function (filter) {

					// Iterate over the products.
					products.forEach(function (item){

						// If the product has the same specification value as the one in the filter
						// push it inside the results array and mark the isFiltered flag true.

						if(typeof item.specs[c] == 'number'){
							if(item.specs[c] == filter){
								results.push(item);
								isFiltered = true;
							}
						}

						if(typeof item.specs[c] == 'string'){
							if(item.specs[c].toLowerCase().indexOf(filter) != -1){
								results.push(item);
								isFiltered = true;
							}
						}

					});

					// Here we can make the checkboxes representing the filters true,
					// keeping the app up to date.
					if(c && filter){
						$('input[name='+c+'][value='+filter+']').prop('checked',true);
					}
				});
			}

		});

		// Call the renderProductsPage.
		// As it's argument give the object with filtered products.
		renderProductsPage(results);
	}


	// Shows the error page.
	function renderErrorPage(){
		var page = $('.error');
		page.addClass('visible');
	}

	// Get the filters object, turn it into a string and write it into the hash.
	function createQueryHash(filters){

		// Here we check if filters isn't empty.
		if(!$.isEmptyObject(filters)){
			// Stringify the object via JSON.stringify and write it after the '#filter' keyword.
			window.location.hash = '#filter/' + JSON.stringify(filters);
		}
		else{
			// If it's empty change the hash to '#' (the homepage).
			window.location.hash = '#';
		}

	}

	var cart = $('.cart');
	cart.on('click', function() {

		createQueryHash(filters);
		alert ("onePhoneViuwer ---");

	});

});

//Above is your code, I've not touch it.

var cartState = 0;			// these 5 variables are global, I use them like "state" in ReactJS
var cartPreviousState = 0;	
var cartObj;				
var previousCartObj;
var cartIcon = document.getElementById('little-cart');

$(document).ready(function() { 
	
	var myCart = getCartStorage ("cart");
	if (myCart.length == 0) { //cart existing verifycation, if it doesn't exist, we create a new one:
		var emptyCart = {
			"totalPhoneNumber" : 0,
			"selectedPhones" : [
				{"id": 1,
				"name": " ",
				"price": 0,
				"image": "assets/images/sony-xperia-z3.jpg",
				"thisPhoneQty" : 0},
				{"id": 2,
				"name": " ",
				"price": 0,
				"image": "assets/images/iphone6.jpg",
				"thisPhoneQty" : 0},
				{"id": 3,
				"name": " ",
				"price": 0,
				"image": "assets/images/htc-one.jpg",
				"thisPhoneQty" : 0},
				{"id": 4,
				"name": " ",
				"price": 0,
				"image": "assets/images/galaxy-alpha.jpg",
				"thisPhoneQty" : 0},
				{"id": 5,
				"name": " ",
				"price": 0,
				"image": "assets/images/nokia-lumia.jpg",
				"thisPhoneQty" : 0},
				{"id": 6,
				"name": " ",
				"price": 0,
				"image": "assets/images/zte-nubia.jpg",
				"thisPhoneQty" : 0},
				{"id": 7,
				"name": " ",
				"price": 0,
				"image": "assets/images/galaxy-s5.jpg",
				"thisPhoneQty" : 0},
				{"id": 8,
				"name": " ",
				"price": 0,
				"image": "assets/images/iphone5s.jpg",
				"thisPhoneQty" : 0}
			]			
		};
		cartObj = JSON.stringify(emptyCart);
		setCartStorage("cart", cartObj, 365); // new Cookie cart creation
		
	}
	else{
		cartObj = JSON.parse(myCart);		  //the cart exist allready, we set our "state"
		cartState = cartObj.totalPhoneNumber;		
	}

	setInterval(function() {				  //this is an analog of React's "render", checks the "state" changes
		if (cartState != cartPreviousState) {
			
			$("#little-cart-phone-qte").html(cartState);
			cartPreviousState = cartState;
		}
		if (cartState != 0) {
			cartIcon.style.display='inline-block';
		}
		else {
			cartIcon.style.display='none';
		}
	}, 114);

	document.getElementById("little-cart").onclick = function(){ //opens cart popup 

		var popupMask=document.getElementById('popup-mask-for-cart');
		popupMask.style.display='block';
		var popupWinAddtoCart=document.getElementById('add-to-check-out');
		popupWinAddtoCart.style.display='block'; // opens 'check-out' popup window
		var myCart = getCartStorage ("cart");
		cartObj = JSON.parse(myCart);
		var divToShow = "<table>";

		document.getElementById('popup-mask-for-cart').onclick = function() {
			popupMask.style.display='none'; //closes 'add to cart' popup window add-one-phone
			popupWinAddtoCart.style.display='none';
		}
		
		for (var i=0; i < cartObj.selectedPhones.length; i++) { //parse thrue cart object and lists all the phones
			if (cartObj.selectedPhones[i].thisPhoneQty > 0) {
				divToShow = divToShow + "<tr><td><img height='54' src = '" + cartObj.selectedPhones[i].image + "'></td>";
				divToShow = divToShow + "<td width='228'>" + cartObj.selectedPhones[i].name + "</td>";
				divToShow = divToShow + "<td width='114'>" + cartObj.selectedPhones[i].thisPhoneQty + "</td></tr>";
			}
		}

		divToShow = divToShow + "</table>";

		$("#show-all-phones").html(divToShow);

		document.getElementById("clear-cart").onclick = function () {
			setCartStorage("cart", "", 365);
			cartState = 0;
			cartPreviousState = 0;
			cartObj=null;
			previousCartObj=null;
			location.reload(); 
		}

		document.getElementById("check-out").onclick = function () {
			alert("Here must be check-out!!!")
			setCartStorage("cart", "", 365);
			cartState = 0;
			cartPreviousState = 0;
			cartObj=null;
			previousCartObj=null;
			location.reload(); 
		}

	}
});

function myFunction (id) {
	//alert("My function's id "+id);
	
	var myCart = getCartStorage ("cart");
	cartObj = JSON.parse(myCart);
	//alert(cartObj.selectedPhones[id-1].thisPhoneQty);
	$("#phone-qty").html(cartObj.selectedPhones[id-1].thisPhoneQty);

	var popupWin=document.getElementById('popup');
	popupWin.style.display="block"; 
	
	var popupMask=document.getElementById('popup-mask');
	popupMask.style.display='block'; 	// opens mask for 'add to cart' popup window
	
	document.getElementById('popup-mask').onclick = function() { // reset changes if mask is clicked
		var popupWinAddtoCart=document.getElementById('add-to-check-out');
		popupWinAddtoCart.style.display='none';
		popupMask.style.display='none';
		document.getElementById('close-popup').click();
	}

	document.getElementById('close-popup').onclick = function() { // reset changes if cancel is clicked
		setCartStorage("cart", myCart, 365);
		cartObj = JSON.parse(myCart);
		cartState = cartObj.totalPhoneNumber;
		popupWin.style.display='none'; //closes 'add to cart' popup window add-one-phone
		popupMask.style.display='none';//closes mask of 'add to cart' popup window add-one-phone
	}

	document.getElementById('add-to-cart').onclick = function() {
		//setCartStorage("cart", myCart, 365);
		popupWin.style.display='none'; //closes 'add to cart' popup window add-one-phone
		popupMask.style.display='none';//closes mask of 'add to cart' popup window add-one-phone
	}

	document.getElementById('add-one-phone').onclick = function() {
		addOnePhone (id);
	}

	document.getElementById('remove-one-phone').onclick = function() {
		removeOnePhone (id);
	}

}

function setCartStorage(cname, cvalue, exdays) { //cart cookie setting
	var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCartStorage (cname) { //get information from cart cookie
	var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function addOnePhone (id) { // adds one phone to cart by id with "state" change 
	var JSONquery = $.getJSON("../../products.json", function( products ) {
			cartState++;
			var myCart = getCartStorage ("cart");
			cartObj = JSON.parse(myCart);
			cartObj.totalPhoneNumber = cartState;
			cartObj.selectedPhones[id-1].thisPhoneQty++;
			cartObj.selectedPhones[id-1].name = products[id-1].name;
			cartObj.selectedPhones[id-1].price = products[id-1].price;
			$("#phone-qty").html(cartObj.selectedPhones[id-1].thisPhoneQty);
			cartObj = JSON.stringify(cartObj);
			setCartStorage("cart", cartObj, 365);
	});
}

function removeOnePhone (id) { // removes one phone from cart by id with "state" change 
	var JSONquery = $.getJSON("../../products.json", function( products ) {
			var myCart = getCartStorage ("cart");
			cartObj = JSON.parse(myCart);
			if (cartObj.selectedPhones[id-1].thisPhoneQty >= 1) {
				cartState--;
				cartObj.totalPhoneNumber = cartState;
				cartObj.selectedPhones[id-1].thisPhoneQty--;
				cartObj.selectedPhones[id-1].name = products[id-1].name;
				cartObj.selectedPhones[id-1].price = products[id-1].price;
				$("#phone-qty").html(cartObj.selectedPhones[id-1].thisPhoneQty);
			}
			cartObj = JSON.stringify(cartObj);
			setCartStorage("cart", cartObj, 365);
	});
}