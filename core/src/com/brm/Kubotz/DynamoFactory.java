package com.brm.Kubotz;


import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.XmlReader;
import com.badlogic.gdx.utils.XmlReader.Element;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntityComponent;
import com.brm.GoatEngine.ECS.core.EntityManager;

import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;

public class DynamoFactory {


    public static Entity createEntity(String blueprintFile, EntityManager entityManager) {
        Entity entity = null;
        try {
            XmlReader reader = new XmlReader();
            Element root = reader.parse(Gdx.files.internal(blueprintFile));
            entity = entityManager.createEntity();
            //For every component declared
            Array<Element> components = root.getChildrenByName("component");
            for(Element compEl : components){
                Class<?> clazz = Class.forName(compEl.getAttribute("name"));    //Create a new instance of that object
                Constructor<?> ctor = clazz.getConstructor(Element.class);
                Object component = ctor.newInstance(compEl);
                String componentId = (String)clazz.getDeclaredField("ID").get(component);

                //Add the component
                entity.addComponent((EntityComponent)component, componentId);
            }
            return  entity;

        } catch (IOException e) {
            e.printStackTrace();
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        } catch (NoSuchFieldException e) {
            e.printStackTrace();
        } catch (InstantiationException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        } catch (NoSuchMethodException e) {
            e.printStackTrace();
        } catch (InvocationTargetException e) {
            e.printStackTrace();
        }
        return entity;
    }









}
