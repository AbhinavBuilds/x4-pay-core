#include "Student.h" // Include our own header file

// Constructor implementation
Student::Student(String name, int id)
{
    _name = name;
    _id = id;
    _grade = 'U';
}

// introduce() method implementation
void Student::introduce()
{
    Serial.print("Hello, my name is ");
    Serial.print(_name);
    Serial.print(", my ID is ");
    Serial.print(_id);
    Serial.print(" and my current grade is ");
    Serial.println(_grade);
}

// setGrade() method implementation
void Student::setGrade(char newGrade)
{
    if (newGrade >= 'A' && newGrade <= 'D' || newGrade == 'F' || newGrade == 'U')
    {
        _grade = newGrade;
        Serial.print(_name);
        Serial.print("'s grade updated to: ");
        Serial.println(_grade);
    }
    else
    {
        Serial.print("Invalid grade for ");
        Serial.print(_name);
        Serial.println(". Grade must be A, B, C, D, F, or U.");
    }
}

// getGrade() method implementation
char Student::getGrade()
{
    return _grade;
}

// getName() method implementation
String Student::getName()
{
    return _name;
}