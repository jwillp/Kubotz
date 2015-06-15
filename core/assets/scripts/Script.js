// SCRIPT USED TO INIT THE SCRIPTS SYSTEMS OF THE ENGINE
kubotzPackage = Packages.com.brm.Kubotz;


function onInit(entity, entityManager) {
	Engine.getSystem().fireEvent(new kubotzPackage.Common.Events.ScriptEvent("0"));
}



function onUpdate(entity, entityManager) {

}


function onInput(entity, buttons) {
	Engine.print("Input!!");
}

function onCollision(contact, entity) {
	
}



function onEvent(event, entity){
	Engine.print("EVENT:" + entity);
	Engine.killOne();
}






