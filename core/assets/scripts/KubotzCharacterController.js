/**
 * Script used to control a Kubotz, according to the input of the player.
 * It verifies user input and translates it to Intent (Actions)
 */
kubotzPackage = Packages.com.brm.Kubotz;
GameButton = InputPackage.GameButton;


function onInit(entity, entityManager){}
function onUpdate(entity, entityManager){}
function onCollision(contact, entity){}
function onEvent(event, entity){ }



/**
* The possible actions of a Kubotz
*/
var Actions = Enum([

        'CROUCH',         // TODO
        'BLOCK',          // TODO
        'DODGE_LEFT',     // TODO
        'DODGE_RIGHT',    // TODO

        //Movement
        'RUN_LEFT',
        'RUN_RIGHT',
        'JUMP',
        'FALL_DOWN',

    //Attacks (PUNCHES AND KICKS I.E. MELEE)
        //AERIALS
        'AIR_ATTACK_UP',      // TODO
        'AIR_ATTACK_NEUTRAL',
        'AIR_ATTACK_DOWN',    // TODO
        'AIR_ATTACK_FORWARD', // TODO
        'AIR_ATTACK_BACK',    // TODO

        //GROUND
        'GROUND_ATTACK_UP',       // TODO
        'GROUND_ATTACK_NEUTRAL',
        'GROUND_ATTACK_DOWN',     // TODO
        'GROUND_ATTACK_FORWARD',  // TODO
        'GROUND_ATTACK_BACK',     // TODO

    //SPECIALS
        //FLY
        'TOGGLE_FLY_MODE',

        //DASH
        'DASH_UP',
        'DASH_DOWN',
        'DASH_LEFT',
        'DASH_RIGHT',

        //Gravity
        'TOGGLE_ANTI_GRAVITY',

        //DRONE GAUNTLET
        'SPAWN_DRONE',

    // OTHER
        //SWORD
            //AERIALS
            'AIR_SWORD_UP',
            'AIR_SWORD_NEUTRAL',
            'AIR_SWORD_DOWN',
            'AIR_SWORD_FORWARD',
            'AIR_SWORD_BACK',

            //GROUND
            'GROUND_SWORD_UP',
            'GROUND_SWORD_NEUTRAL',
            'GROUND_SWORD_DOWN',
            'GROUND_SWORD_FORWARD',
            'GROUND_SWORD_BACK',

        //GUN
            'SHOOT',


        //GRAB
            'GRAB',
            'THROW',


        'NONE' //Nothing is requested
]);



function onInput(entity, buttons) {
	

	console.log(buttons.contains(GameButton.BUTTON_A), 'WARNING');






}












