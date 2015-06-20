// SCRIPT USED TO INIT THE SCRIPTS SYSTEMS OF THE ENGINE
kubotzPackage = Packages.com.brm.Kubotz;

function onInit(entity, entityManager) {
	console.log("SCRIPT INITED", "WARNING");
}



function onUpdate(entity, entityManager) {
	entities = entityManager.getEntitiesWithComponent("PLAYER_INFO");
	if(entities.length == 1){
		console.log("WIN!", 'SUCCESS');
		entities[0].removeComponent("PLAYER_INFO");

	}
}


function onInput(entity, buttons) {
	console.log("OK");
}

function onCollision(contact, entity) {
	phys = entity.getComponent('PHYSICS_COMPONENT');
	pef  = entity.getComponent("PARTICLE_EMITTER_COMPONENT");
    pos  = phys.getPosition().cpy();
	pef.addEffect(Gdx.files.internal('particles/eclatRouille.pe'), pos);
}



function onEvent(event, entity){
	console.log(event, "WARNING");
}






